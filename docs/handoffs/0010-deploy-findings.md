# 🔍🚀 [0010] Findings — one VM, one domain (M8b)

> Findings of [handoff 0010](0010-deploy.md). What the handoff did not decide, the checks with evidence, the image, the doubts, what the owner types.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-05 | Sven Reiser | C1–C3 pass (Track A, Docker Desktop 28.5 on the Mac, `DOMAIN=localhost`) · C4–C5 Track B · C6–C8 owner |

## 🖥️ Track A · the box

Branch `m8b-box`, worktree `standkreis-dex-m8ba`. Files: `app/Dockerfile`, `app/.dockerignore`, `deploy/` (`compose.yml`, `Caddyfile`, `deploy.sh`, `backup.sh`, `.env.example`, `README.md`), `.github/workflows/check.yml` and `deploy.yml`, the `output` line of `next.config.ts`, one script in `package.json`.

### 📐 What the handoff did not decide

| Topic | Decision | Why |
| --- | --- | --- |
| Runner base | **`alpine:3.24` + the node binary copied out of `node:22-alpine`** (+ `libstdc++`, `libgcc`), not `node:22-alpine` itself | The node image carries npm, corepack and yarn (~25 MB) the server never calls, and a `rm` in a later layer does not shrink an image. 336 MB → 299 MB. The two alpine versions must stay in step (doubt below) |
| Migrate image | Its own stage: `npm i prisma@<version from package.json>`, the schema, the migrations. 593 MB | Built from `deps` it inherited node_modules and the npm cache: 2.3 GB. The Prisma CLI alone is still half a gigabyte; it is a one-shot container, never a running one |
| `deps` layer | `npm ci --no-audit --no-fund && npm cache clean --force` | 1 GB of npm cache otherwise sits in the build cache for nothing |
| Build inside the image | `npx prisma generate && npm run build` (not `next build`) | `prebuild`/`postbuild` mint the build id and write `sw-manifest.json` into `.next/static/<id>/`; `.next/static` is copied whole, so the manifest ships (C1) |
| Photos volume owner | `mkdir /data/photos && chown dex` in the image, user `dex` runs the server | Docker seeds a fresh named volume with the image directory's ownership; the non-root server can write |
| Healthcheck | `wget /api/health \|\| wget --spider /de/` (busybox wget follows the 308 to `/de`) | `/api/health` is Track B's; without the fallback `app` would never turn healthy on this branch and Caddy would not start. **Drop the `\|\|` part at the merge** |
| `db` port | `${DB_BIND:-127.0.0.1:5432}:5432`, loopback only | The handoff said "no host port" and, one row later, `ssh -L 5434:localhost:5432` for the ETL, which needs one. Loopback plus the VM firewall is the same as none from outside; on the Mac `DB_BIND=127.0.0.1:5439` dodges the two dev Postgres |
| `DATABASE_URL` | Assembled in Compose from `POSTGRES_PASSWORD`; `.env` holds four values (`DOMAIN`, `POSTGRES_PASSWORD`, `WEBAUTHN_SECRET`, optional `BACKUP_TARGET`, `DB_BIND`) | One password, typed once; `WEBAUTHN_RP_ID=$DOMAIN`, `WEBAUTHN_ORIGIN=https://$DOMAIN` follow from the domain and cannot drift |
| Caddy ports | 80, 443 tcp **and** 443 udp | HTTP/3; the udp line costs nothing |
| `deploy.yml` | `appleboy/ssh-action@v1`, `concurrency: deploy`, `workflow_dispatch` only; the script is `~/standkreis-dex/deploy/deploy.sh` | The handoff's switch. The README says which line turns on push-to-main |
| `check.yml` | Node 22, `npm ci`, `npm run check`, **no Postgres service** | Every test imports pure modules (`etl/rules`, `etl/prune`, `searchCap`, `AtlasSearch`, `QueueRows`, the locale JSONs); the export build renders nothing from the DB. Checked all six files |
| `start:standalone` script | Copies `.next/static` and `public` into `.next/standalone/` and runs `server.js` | `next start` still serves but warns "does not work with output: standalone"; Track B's C4 (`node server.js`) and the owner need the one-liner |
| Restore | `pg_restore --clean --if-exists --no-owner` into the migrated fresh DB, then `tar xz` into the photos volume | Proven in C3; `_prisma_migrations` travels in the dump, `migrate` afterwards says "No pending migrations" |

### 🧪 C1 · `docker build`

| What | Value |
| --- | --- |
| First build, `node:22-alpine` runner | 336 MB, 1 min 22 s (M-series Mac, base image pull included) |
| Final, alpine + node runner | **299 MB**; `/app` 77 MB of which `node_modules` 70 MB (`@img` sharp 45 MB, `next` 18 MB, `@prisma` 5 MB), node binary 120 MB, alpine + libstdc++ 11 MB |
| Cold build through Compose (`docker builder prune -af` first, base images cached) | **1 min 30 s** for `migrate` + `app` |
| `docker run -e DATABASE_URL=… -p 3010:3000` | `/de/` → 308 → `/de` 200, 26.7 KB; `[sweep] done` in the log, so `instrumentation.ts` runs under `node server.js` |
| Build id | `.next/BUILD_ID` = `mtovfosq`; the RSC payload in the HTML carries `"b":"mtovfosq"`; the chunk registers `sw.js?v=mtovfosq`; `/_next/static/mtovfosq/sw-manifest.json` → 200, `sw-manifest mtovfosq: 19 files, 919 KB` printed by `postbuild` inside the build |

### 🧪 C2 · `docker compose up` with `DOMAIN=localhost`

| Step | Evidence |
| --- | --- |
| `up -d --build`, fresh volumes | `db` healthy, `migrate` `Exited (0)`: "20260904213727_init, 20260905142042_regions_tiles_passkeys — All migrations have been successfully applied"; `_prisma_migrations` has both rows with `finished_at`; `app` healthy after ~20 s; `caddy` up on 80/443 (both were free on the Mac) |
| Caddy | `curl -k https://localhost/de/` → HTTP/2 200, 26.7 KB; `http://localhost/de/` → 308 to https; manifest under the new id `mtovmlij` → 200 |
| Upload | `curl -k -F file=@photo.jpg https://localhost/api/photo` → 201 `{"id":"bb73c7fd…"}` with a `dex_id` cookie; file `bb73c7fd….jpg` (22,997 B) in `/data/photos` owned by `dex` |
| Sighting | A `Taxon` row inserted by `psql` (a fresh DB has none), then `POST /api/trpc/sighting.create` with the cookie → `evidence: "photographed"`, `first: true`; the Asset row points at the sighting |
| `down && up -d` | `app` healthy again, the file still there, `/api/photo/bb73c7fd…` → 200 `image/jpeg` 22,997 B, the sighting row back |
| `DB_BIND=127.0.0.1:5439` | `psql` from the Mac reaches the stack's DB through the loopback port (the ETL tunnel's shape) |

### 🧪 C3 · `backup.sh`, restore into a fresh stack

| Step | Evidence |
| --- | --- |
| `BACKUP_DIR=/tmp/dex-backup deploy/backup.sh` against the running `dex` stack | `db-20260905-231141.dump` 27 KB, `photos-20260905-231141.tgz` 22 KB |
| Fresh stack `docker compose -p dex-c3 up -d app` (own volumes, no Caddy) | `migrate` `Exited (0)`, 0 sightings, 0 photos |
| Restore per README §♻️ | `pg_restore` exit 0, `tar` exit 0; sighting `8215ca67…` `photographed` with Asset `bb73c7fd…`; `_prisma_migrations` 2 rows; the file back in `/data/photos`; `GET /api/photo/bb73c7fd…` from inside the network → 22,997 B |
| `migrate` on the restored DB | "No pending migrations to apply" |
| `npm run check` on the branch | Green: 30 tests, export build, 18 s |

### ❓ Doubts

| Doubt | Weight |
| --- | --- |
| **299 MB is under 300 by one.** 120 MB is the node binary, 45 MB sharp (both platforms' libvips under `@img`, pulled by Next's image optimizer even though no `next/image` was checked). Dropping sharp or building node against a smaller base is a later question; the number will cross 300 with the next Next release | low, cosmetic |
| **Two alpine versions to keep in step.** The node binary is copied from `node:22-alpine` (alpine 3.24.1 today) into `alpine:3.24`. When the node tag moves to 3.25 the runner line must follow; musl is ABI-stable, so a drift would most likely still run, but it is a trap the Dockerfile header names | medium |
| **The healthcheck fallback.** Until Track B lands, `\|\| wget --spider /de/` makes the check pass on a server whose DB is dead. Remove it at the merge, or `/api/health` proves nothing | resolved at merge |
| **The VM builds.** A CX22 has 4 GB; `next build` peaked near 2 GB on the Mac. Should it OOM on the VM, a 2 GB swap file (`fallocate -l 2G /swapfile`) is the first thing to try, before a registry | medium, unmeasured |
| **`next start` warns.** "next start does not work with output: standalone", though it serves. Scripts that used `next start -p 3002` (findings 0009 drivers) keep working; `npm run start:standalone` is the honest path now | low |
| **`docker builder prune -af` ran on this Mac** for the cold-build timing. It dropped the build cache of every project on the machine (rebuildable, nothing else) | disclosure |
| **The migrate image is 593 MB** for one CLI. `prisma` pulls `@prisma/engines`, `effect` and friends. It shares nothing with the runner, so the VM stores ~900 MB of images. Acceptable on a 40 GB disk; a later `prisma migrate diff --script` + `psql` would shrink it to nothing | low |

### 🔀 For the merge

- `app/next.config.ts`: one line, `output: isExport ? 'export' : 'standalone'`. `app/package.json`: the `start:standalone` script; Track B adds no scripts, `zod` stays as is.
- `deploy/compose.yml` app healthcheck: drop `|| wget -q --spider http://127.0.0.1:3000/de/` once `/api/health` exists; `deploy/README.md` §2 has the same "once Track B is merged" aside to delete.
- Roadmap row M8b and `deploy/README.md` are the only docs touched besides this file; `app/etl/README.md` §🚀 (Track B) should say `ssh -L 5434:localhost:5432` and `DATABASE_URL=postgresql://dex:<POSTGRES_PASSWORD>@localhost:5434/dex`, which is what the loopback port serves.
- On `main` after both merges: `cd app && npm run build && npm run start:standalone`, then C4/C5 against it; `docker compose -f deploy/compose.yml up -d --build` with `deploy/.env` from the example is the C2 re-run.
