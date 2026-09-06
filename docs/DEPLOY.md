# ▲ Deploy — the live stack

> How the app runs in production as of 2026-09-06. Decisions: [handoff 0011](handoffs/0011-vercel.md) and its findings. The one-VM deploy of [handoff 0010](handoffs/0010-deploy.md) was removed, see §🗑️.

| 🗓️ Updated | 👤 Owner | 🌐 Live | 🔁 Fallback |
| --- | --- | --- | --- |
| 2026-09-06 | Sven Reiser | https://atlas.standkreis.de | https://standkreis-dex.vercel.app |

## 🧱 Stack

| Piece | Service | Where | Notes |
| --- | --- | --- | --- |
| App | **Vercel** (team "Standkreis", Pro), project `standkreis-dex` | functions in `fra1`, Node.js 24 | root directory `app`; build command `npx prisma migrate deploy && npm run build` |
| Database | **Neon Postgres** (Free), store `standkreis-atlas` | Frankfurt `eu-central-1` | via the Vercel marketplace; connected to Production and Preview only, so local dev keeps the Docker Postgres on `:5433` |
| Photos | **Vercel Blob**, private store `standkreis-dex-blob` | `iad1` | connected to all three environments; user photos live at `photos/<assetId>.jpg`, streamed by `/api/photo/<id>` (0011 Track A) |
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
| `BLOB_READ_WRITE_TOKEN` | Blob integration, all environments; also `app/.env.local` on the Mac (git-ignored) | Photo store: set → Blob, unset → disk under `PHOTO_DIR` | yes |
| `WEBAUTHN_RP_ID` | project, value `standkreis.de` | Passkey relying-party id: the **apex**, so passkeys survive a subdomain move | no |
| `WEBAUTHN_ORIGIN` | project, value `https://atlas.standkreis.de` | The origin passkeys are minted for | no |
| `WEBAUTHN_SECRET` | project | HMAC key for challenge cookies and delete tokens, 64 hex | yes |
| `PHOTO_DIR` | not set on Vercel (removed 2026-09-06 after 0011 A) | Disk photo store for dev and `next start`; on Vercel the Blob token replaces it | no |
| `CRON_SECRET` | project, Prod + Preview | Guards `GET /api/cron/sweep`; Vercel's cron sends it as `Authorization: Bearer …` (0011 Track B). Unset: the route answers 401 to everyone | yes |

`next.config.ts` picks `output` by environment: `'export'` for the static export, `undefined` otherwise (Vercel's tracer fails on `standalone`: `ENOENT next-server.js.nft.json`).

## 🚀 Deploying

| Trigger | Result |
| --- | --- |
| Push to `main` | Production deploy → atlas.standkreis.de |
| Push to any other branch | Preview deploy on a `*.vercel.app` URL, against the same Neon DB (Preview is connected). Passkeys fail there by design (RP id) |

The build command runs `npx prisma migrate deploy` first: **migrations run only there**, never from the Mac (owner's dev rule: no reset, no push, no dev migrate against production). Then `npm run build`: `prebuild` mints the build id, `next build`, `postbuild` writes the worker manifest.

## 🩺 Health, cron, background work

| Route | Who calls it | Answer |
| --- | --- | --- |
| `GET /api/health` | an uptime monitor, you | `200 {ok, buildId, sweepAt}`; `503 {ok: false, error}` when Neon does not answer. `sweepAt` is when the last sweep finished **in this instance** (null on a fresh one; there is no table for the stamp) |
| `GET /api/cron/sweep` | Vercel's cron, hourly (`app/vercel.json`, `0 * * * *`), with `Authorization: Bearer $CRON_SECRET`; by hand with `curl -H "Authorization: Bearer $CRON_SECRET" https://atlas.standkreis.de/api/cron/sweep` | the `SweepResult` JSON (`regions`, `content`, `contentDone`, `contentFailed`, `photos`, `seconds`, `cut`); `null` when another run holds the advisory lock; `401` without the secret. Vercel → project → Cron Jobs shows the runs |

Jobs that must outlive the response (the region job on `dex.requestRegion`, the content kick on `taxon.ensure`) go through `waitUntil` (`app/src/server/jobs.ts`), so the invocation lives until they settle; the tRPC route and the cron route declare `maxDuration = 300` (fluid compute). The sweep stops starting new batches at 240 s and reports `cut: true`; the next hour continues, every step is idempotent. `register()` (instrumentation) only checks the environment on Vercel; the sweep at start is for `next start` on a laptop.

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

[Handoff 0011](handoffs/0011-vercel.md) is closed ([findings](handoffs/0011-vercel-findings.md)); the table keeps what it settled.

| Gap | Today | Track |
| --- | --- | --- |
| Photos persist | ✅ private Blob behind the `photos.ts` seam, streamed with an immutable cache header (0011 A, C1–C3); owner's C6 on the phone | A, done |
| Region job, content kick outlive the response | ✅ `waitUntil` via `server/jobs.ts`, `maxDuration = 300` on the tRPC route (0011 B, C4); proven on Vercel itself by the owner's C6 | B, done |
| Restart sweep | ✅ hourly `GET /api/cron/sweep` with `CRON_SECRET`, `register()` skips the sweep on Vercel (0011 B, C5) | B, done |
| Resend domain, magic link | not added | M7b |

## 🗑️ Removed: the VM deploy

[Handoff 0010](handoffs/0010-deploy.md) built a one-VM deploy (Docker Compose, Caddy, Postgres on the box), [findings 0010](handoffs/0010-deploy-findings.md) proved it on the Mac, Hetzner refused the card. `deploy/`, `app/Dockerfile` and `.github/workflows/deploy.yml` were deleted rather than left to rot once 0011 moves photos to Blob. If Vercel ever bills or limits bite:

```bash
git checkout 113a630 -- deploy app/Dockerfile app/.dockerignore .github/workflows/deploy.yml
```
