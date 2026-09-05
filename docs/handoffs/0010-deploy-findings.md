# 🔍🚀 [0010] Findings — one VM, one domain (M8b)

> Findings of [handoff 0010](0010-deploy.md). What the handoff did not decide, the checks with evidence, the image, the doubts, what the owner types.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-05 | Sven Reiser | C1–C3 pass (Track A, Docker Desktop 28.5 on the Mac, `DOMAIN=localhost`) · C4 C5 pass (Track B, production build, `next start -p 3004`, headless Chrome over CDP) · C6–C8 the owner with the phone |

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

## 🌐 Track B · the app on a real origin

Branch `m8b-origin`, worktree `standkreis-dex-m8bb`. Proven against `npm run build` + `NODE_ENV=production npx next start -p 3004` (the main checkout holds 3000 and 3002), the dev DB on 5433.

### 📐 Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Where the guard fires | `src/server/env.ts` reads and validates once at import; `src/instrumentation.ts` `register()` imports it **first**, before the sweep | Nothing on the start path imported `webauthn.ts`: the tRPC handler loads lazily on the first request, so a guard there would have let the server come up and only fail the first call. Instrumentation is the one hook Next runs at start |
| How it fails | `console.error` naming every missing or invalid variable, then `process.exit(1)` | An error thrown inside `register()` is logged by Next and the server keeps serving; exit is the only way to meet "exits within a second" |
| The build phase | Lenient when `NEXT_PHASE === 'phase-production-build'` | `next build` runs with `NODE_ENV=production`; the Dockerfile builds without a `.env`, `npm run check` builds the export on laptops and CI. The guard means the *server*, not the compiler |
| Secret length | `WEBAUTHN_SECRET` ≥ 32 characters in production | `openssl rand -hex 32` gives 64; a ten-character secret is refused with the same message ("at least 32 characters: openssl rand -hex 32") |
| `WEBAUTHN_ORIGIN` in dev | Optional, empty means "trust the request's localhost origin" (unchanged behaviour) | `next dev -p 3001` and 3002 keep working without a `.env` |
| Cookie `Secure` | `x-forwarded-proto` (first value) decides; without the header, the request URL's scheme | Behind Caddy the request is plain http; on dev localhost a `Secure` cookie would never come back. Both `dex_id` and the challenge cookie go through the one `setCookie`, so both get the flag |
| 400 days | `IDENTITY_COOKIE_MAX_AGE = 34_560_000` exported from `trpc.ts`, used by the mint and the passkey adoption | Was the literal twice; the cap browsers enforce |
| `sweepAt` | `instrumentation.ts` stamps `globalThis.dexSweepAt` when the sweep resolves; `/api/health` reads it (`null` until then) | The route handler is its own bundle, a module variable in `instrumentation.ts` would not be shared. `sweep.ts` is not Track B's file, so the stamp stays in the hook that already had to change |
| Health on a dead DB | `{ ok: false, error }` with **503** and `cache-control: no-store` | Compose's healthcheck and an uptime monitor key on the status |
| Tile validation | `z` 0–19, `x` `y` digits only and `< 2^z`; else 400. Upstream not ok or unreachable (10 s timeout) → 502 | Bounded proxy; a bad URL never reaches OSM |
| User-Agent | `standkreis-dex/<build id> (+<first WEBAUTHN_ORIGIN>)`, `https://standkreis.example` when unset | OSM asks for an identifying UA with a contact; the origin is the contact once the domain exists |
| Tile URL on the client | `${NEXT_PUBLIC_API_URL ?? ''}/api/tiles/8/x/y` | Same rule as the photos: the static export has no route handlers |
| Worker rule | `/api/tiles/` on the own origin joins `/api/photo/` in `isImage` → cache-first in `dex-images` | The image path already handles same-origin (`fetch(req)`, `res.ok` → put) |
| `.env.example` | `app/.env.example`, plus `!.env.example` in `app/.gitignore` | `.env*` was ignored wholesale; without the exception the file would never have been committed |

### 🧪 Checks

| # | What | Evidence | Pass |
| --- | --- | --- | --- |
| C4a | `NODE_ENV=production npx next start -p 3005` with every variable but `WEBAUTHN_SECRET` | Log: `[env] refusing to start, the environment is incomplete:` / `WEBAUTHN_SECRET: not set` / `See app/.env.example.`; process gone and no listener on 3005 after 4 s (Next's "Ready in 60ms" banner prints before instrumentation runs). A 10-character secret: same, "at least 32 characters: openssl rand -hex 32" | ✅ |
| C4b | All five set, `next start -p 3004` | `GET /api/health` → `200`, `cache-control: no-store`, `{"ok":true,"buildId":"mtovgmy8","sweepAt":null}`; 4 s later `"sweepAt":"2026-09-05T21:05:53.558Z"` after `[sweep] done: regions 0 · content 0 · photos 0 · 0.2 s` | ✅ |
| C5a | `curl -H 'x-forwarded-proto: https' /api/trpc/identity.me` | `set-cookie: dex_id=5bbd009f-…; Path=/; Max-Age=34560000; HttpOnly; SameSite=Lax; Secure` | ✅ |
| C5b | The same without the header (dev) | `…; HttpOnly; SameSite=Lax` — no `Secure`, so localhost keeps its cookie | ✅ |
| C5c | `GET /api/tiles/8/134/86` | `200`, `content-type: image/png`, `cache-control: public, max-age=604800`, 52,135 bytes, `file`: PNG 256 × 256. `20/1/1`, `8/999/1`, `8/a/1`, `8/-1/1` → 400 | ✅ |
| C5d | Worker caches tiles offline: headless Chrome over CDP attached at the browser level (the `offline.mjs` approach), dev identity with Mainz-Bingen, `/de` until the worker controls, then `/de/species/2490719` (Feuersalamander) | Online: map with 9 `/api/tiles/8/…` images decoded, **9 tile entries in `dex-images`**, 9 tile requests seen from the worker session. Offline: `fetch('/api/tiles/8/134/86')` → `200 image/png`, cache header intact, 52,125 bytes, from the worker; an uncached tile (`8/1/1`) throws as it should. Species page reloaded offline: map present, `map-waits` absent, 9 / 9 tiles decoded | ✅ |
| — | `npm run check` | typecheck, lint (one pre-existing warning in `scripts/m8b/queue.mjs`), 30 tests, export build `sw-manifest mtovk0m3: 19 files, 919 KB` | ✅ |

### 📁 Files touched

| File | What |
| --- | --- |
| `app/src/server/env.ts` | new: zod schemas strict / lenient, `isProduction`, `env` |
| `app/src/server/webauthn.ts` | `rpID`, `expectedOrigin`, `secret` from `env`; the warn line gone |
| `app/src/server/trpc.ts` | `isHttps`, `IDENTITY_COOKIE_MAX_AGE`, `Secure` on `setCookie` |
| `app/src/server/routers/identity.ts` | the adoption cookie uses the constant (one line, plus its import) — not on the list, the literal lived there |
| `app/src/instrumentation.ts` | imports `env` first; stamps `globalThis.dexSweepAt` — not on the list, see decisions |
| `app/src/app/api/health/route.ts` | new |
| `app/src/app/api/tiles/[z]/[x]/[y]/route.ts` | new |
| `app/src/components/SpeciesMap.tsx` | the `OSM` URL only |
| `app/public/sw.js` | `isImage` and the header comment |
| `app/.env.example` | new; `app/.gitignore` gained `!.env.example` |
| `app/etl/README.md` | §🚀 Filling production |

`identity.ts` under `src/server/` does not exist; the cookie is minted in `trpc.ts` and re-set in `routers/identity.ts` and `routers/data.ts` (the delete clears it with `maxAge: 0`, untouched: it goes through the same `setCookie`, so it carries `Secure` too).

### ❓ Doubts

| # | Doubt | Proposal |
| --- | --- | --- |
| B1 | `db.ts` (`DATABASE_URL`) and `photos.ts` (`PHOTO_DIR`) still read `process.env` with dev fallbacks; `env.ts` validates both are set in production but they are not read through it | Both files are outside Track B's list. One line each (`env.DATABASE_URL`, `env.PHOTO_DIR`) at the merge, or leave: the guard already refuses a server without them |
| B2 | `SpeciesMap.tsx` line 33 still says "tiles are never cached"; now they are, and the `map-waits` line only shows for a species never opened online | Fix the comment at the merge (the file's limit was the URL) |
| B3 | The tile proxy has no rate limit: a stranger could pull OSM through the app's origin | Nine tiles per region at one zoom; Caddy could add a `rate_limit` later. Not before there is a second user |
| B4 | `process.exit(1)` in a module that tests could import: vitest never sets `NODE_ENV=production`, the branch throws instead | Fine; noted so nobody imports `env.ts` into a production-mode script expecting an exception |
| B5 | The OSM `content-type` is passed through; a captive portal answering `text/html` with 200 would be cached for a week by the browser | Could pin `image/png` and reject others; left as is, the phone talks to the VM, not to OSM |
| B6 | The tunnel in `etl/README.md` §🚀 assumes the `db` service publishes nothing (as the handoff says); the two ways around it are written down but untested without a VM | Owner: pick one at C7, correct the section |

### 🔀 For the merge

- Track A's `deploy/.env.example` should list the same five names as `app/.env.example` (`DATABASE_URL`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`, `WEBAUTHN_SECRET`, `PHOTO_DIR`); production values: `WEBAUTHN_RP_ID=standkreis.<tld>`, `WEBAUTHN_ORIGIN=https://standkreis.<tld>`, `WEBAUTHN_SECRET` from `openssl rand -hex 32` (≥ 32 chars), `PHOTO_DIR=/data/photos`.
- The Compose healthcheck may read `/api/health` (200 `ok`, 503 when the DB is gone). The image's `next build` needs **no** env: the guard skips the build phase.
- `instrumentation.ts` and `routers/identity.ts` are touched beyond the list (two lines and one line); nothing of Track A's.
- After merging: `npm run check`, then B1 and B2 above if wanted.