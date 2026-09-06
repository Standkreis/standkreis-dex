# ▲ Deploy — the live stack

> How the app runs in production as of 2026-09-06. Decisions and the open work: [handoff 0011](handoffs/0011-vercel.md). The one-VM deploy of [handoff 0010](handoffs/0010-deploy.md) was removed, see §🗑️.

| 🗓️ Updated | 👤 Owner | 🌐 Live | 🔁 Fallback |
| --- | --- | --- | --- |
| 2026-09-06 | Sven Reiser | https://atlas.standkreis.de | https://standkreis-dex.vercel.app |

## 🧱 Stack

| Piece | Service | Where | Notes |
| --- | --- | --- | --- |
| App | **Vercel** (team "Standkreis", Pro), project `standkreis-dex` | functions in `fra1`, Node.js 24 | root directory `app`; build command `npx prisma migrate deploy && npm run build` |
| Database | **Neon Postgres** (Free), store `standkreis-atlas` | Frankfurt `eu-central-1` | via the Vercel marketplace; connected to Production and Preview only, so local dev keeps the Docker Postgres on `:5433` |
| Photos | **Vercel Blob**, private store `standkreis-dex-blob` | `iad1` | connected to all three environments; the Blob-backed photo store is **not built yet** ([0011 Track A](handoffs/0011-vercel.md)) |
| Mail | **Resend** (EU region) | — | for M7b; the domain is not yet added at Resend |
| DNS | united-domains | — | `atlas` CNAME → Vercel; the apex `standkreis.de` is reserved for a later landing page |

Hosting decision: Hetzner refused the owner's card on 2026-09-05, one day after the VM deploy was merged. Vercel took its place.

## 🔑 Environment

No values here. Set in Vercel → Settings → Environment Variables unless the row says otherwise.

| Variable | Set where | Purpose | Sensitive |
| --- | --- | --- | --- |
| `DATABASE_URL` | Neon integration (prefix `DATABASE_`), Prod + Preview | The app's pooled connection | yes |
| `DATABASE_URL_UNPOOLED` | Neon integration, Prod + Preview | The ETL from the Mac (§🗄️); unused by the app | yes |
| `DATABASE_*` (the rest) | Neon integration | Host, user, password pieces the integration adds; unused | yes |
| `BLOB_READ_WRITE_TOKEN` | Blob integration, all environments; also `app/.env.local` on the Mac (git-ignored) | Photo store, once 0011 Track A lands | yes |
| `WEBAUTHN_RP_ID` | project, value `standkreis.de` | Passkey relying-party id: the **apex**, so passkeys survive a subdomain move | no |
| `WEBAUTHN_ORIGIN` | project, value `https://atlas.standkreis.de` | The origin passkeys are minted for | no |
| `WEBAUTHN_SECRET` | project | HMAC key for challenge cookies and delete tokens, 64 hex | yes |
| `PHOTO_DIR` | project, value `/tmp/photos` | Stopgap: photos land in `/tmp` and **do not persist**; goes away with 0011 A | no |
| `CRON_SECRET` | not yet set | Guards the sweep cron route, 0011 Track B | yes |

`next.config.ts` picks `output` by environment: `'export'` for the static export, `undefined` otherwise (Vercel's tracer fails on `standalone`: `ENOENT next-server.js.nft.json`).

## 🚀 Deploying

| Trigger | Result |
| --- | --- |
| Push to `main` | Production deploy → atlas.standkreis.de |
| Push to any other branch | Preview deploy on a `*.vercel.app` URL, against the same Neon DB (Preview is connected). Passkeys fail there by design (RP id) |

The build command runs `npx prisma migrate deploy` first: **migrations run only there**, never from the Mac (owner's dev rule: no reset, no push, no dev migrate against production). Then `npm run build`: `prebuild` mints the build id, `next build`, `postbuild` writes the worker manifest.

## 🗄️ Filling or refreshing the database from the Mac

The ETL runs on the Mac against Neon over the **unpooled** URL. Only the set tables travel (`Region`, `Taxon`, `Plausibility`, `Lookalike`, reference `Asset`s); sightings and identities never do. Details and the `pg_dump` alternative: [`app/etl/README.md` §🚀](../app/etl/README.md).

```sh
cd app
npx vercel env pull --environment production /tmp/dex-prod.env   # never into the repo
export DATABASE_URL="$(grep '^DATABASE_URL_UNPOOLED=' /tmp/dex-prod.env | cut -d= -f2- | tr -d '"')"
npm run etl -- region "Mainz-Bingen"
npm run etl -- content --region "Mainz-Bingen"
rm /tmp/dex-prod.env
```

First fill on 2026-09-06: the region job took 111 s (1,617 GBIF requests), set of 929 species.

## 🧰 Vercel CLI

`npx vercel` on the Mac is logged in; `app/.vercel/` (git-ignored) links the folder to the project.

| Want | Type (in `app/`) |
| --- | --- |
| Log in | `npx vercel login` |
| Link the folder | `npx vercel link` |
| List variables | `npx vercel env ls` |
| Pull variables | `npx vercel env pull --environment production <file>` |
| Deploy by hand | not needed; push |

## 🚧 Not done yet

Everything below is [handoff 0011](handoffs/0011-vercel.md).

| Gap | Today | Track |
| --- | --- | --- |
| Photos persist | `/tmp`, gone on the next invocation | A: Blob behind the `photos.ts` seam |
| Region job, content kick outlive the response | in-process, die when the function freezes | B: `waitUntil` |
| Restart sweep | runs per cold start, races itself | B: hourly cron route + `CRON_SECRET` |
| Resend domain, magic link | not added | M7b |

## 🗑️ Removed: the VM deploy

[Handoff 0010](handoffs/0010-deploy.md) built a one-VM deploy (Docker Compose, Caddy, Postgres on the box), [findings 0010](handoffs/0010-deploy-findings.md) proved it on the Mac, Hetzner refused the card. `deploy/`, `app/Dockerfile` and `.github/workflows/deploy.yml` were deleted rather than left to rot once 0011 moves photos to Blob. If Vercel ever bills or limits bite:

```bash
git checkout 113a630 -- deploy app/Dockerfile app/.dockerignore .github/workflows/deploy.yml
```
