# 🔎 [0004] Findings — the scaffold

> Companion to [the handoff](0004-scaffold.md). What was decided that the spec did not say. One table.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-04 | Sven Reiser | S1–S8 pass, see below |

| Decision | Chosen | Why, and what was rejected |
| --- | --- | --- |
| i18n library | **next-intl 4**, `[locale]` segment, `localePrefix: 'always'`, no middleware | The only mainstream App Router library that renders statically with `setRequestLocale`. Middleware and cookie-based locale detection need a server, which the export has not. `/` picks the browser language client-side, `en` fallback |
| Route slugs | English (`/de/journal`, `/de/you`), labels localised | One slug per screen keeps `Link` trivial. Localised pathnames are a one-line next-intl option if wanted |
| Folder layout | `app/` at the root, `src/` inside; `(root)` route group for `/`, `[locale]` for everything else; `server/` for Prisma and tRPC, `trpc/` for the client | Two root layouts so `/` needs no locale. `packages/` waits for a second package |
| Static export switch | `STATIC_EXPORT=1` sets `output: 'export'`, `trailingSlash`, and `pageExtensions: ['tsx']` | Dropping `.ts` from routing files removes the tRPC `route.ts` from the export without moving files. Rejected: renaming folders in a build script, `force-static` on a handler that reads cookies |
| API location | tRPC route handler inside Next; client URL from `NEXT_PUBLIC_API_URL` | Same origin in dev and `next start`; the export points at a host. Nothing else to run locally |
| Identity stub | Cookie `dex_id`, HttpOnly, SameSite=Lax, 400 days; minted in the tRPC context when the cookie is missing or unknown | The route handler sets the cookie via `responseMeta`. An unknown id gets a fresh identity rather than an error |
| Theme | `prefers-color-scheme` media query over the `@theme` variables; no `data-theme` | Findings doubt 34: follow the system. The spike's hash override is gone; screenshots use CDP emulation instead |
| Font | System stack, nothing loaded | The spike declared Inter but never loaded it; the reference shots are system font. Loading Inter would change them |
| Icon set | The spike's stroke paths, verbatim, in `Marks.tsx` | One weight for bar, toggle and FAB. No icon library |
| Prisma | 7.10, `prisma-client` generator into `src/generated/prisma` (gitignored), `@prisma/adapter-pg`, `prisma.config.ts` with the dev URL as default | Prisma 7 needs a driver adapter and a config file; `prisma generate` runs on `postinstall`. Dev Postgres on **5433** because a sibling project holds 5432 |
| Schema beyond the ER diagram | `Sighting.wildness` (wild · captive · cultivated), `Sighting.place`, `Asset.kind` (image · sound), `Asset.origin`, `Asset.owner`, `Plausibility.source`, `Filter.wholeYear`, `Taxon.facts` | Spec §⚖️ and §🎨 need them; the spike rendered them. All optional or defaulted, so the ETL can fill in stages |
| Tests | Vitest, one test: `de.json` and `en.json` have identical key sets | S4 as a test. Component tests wait for a component worth testing |
| Screenshots | `app/scripts/shot.mjs`, headless Chrome over CDP, no dependency | Headless Chrome ignores window widths under 500 px, so the 390 px shots for S2 need device-metrics emulation |
| Dev badge | `devIndicators.position: 'top-right'` | The default bottom-left badge sits on the Dex tab |
| npm | Dev dependencies installed with `--legacy-peer-deps`; `.npmrc` records it | npm 10.9.8 crashes in arborist (`edgesOut` of null) resolving peers for vitest 4 in this tree. `npm ci` from the lockfile works |

## 🧪 Checks

| # | Result |
| --- | --- |
| S1 | `npm run check` green: typecheck, lint, 1 test, export build |
| S2 | Bar at 390 × 844 matches [grid a](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a.webp): same icons, raised ＋, same colours |
| S3 | Dark swaps every surface via the media query; no literal colour in the shell |
| S4 | All strings from keys; `/de` and `/en` differ in every visible string; parity test passes |
| S5 | Every field of `spike/ui/src/types.ts` has a column or a derivation (`months` ← Plausibility, `state` ← Study + Sighting, `interactions` ← Interaction) |
| S6 | `out/` served by `python3 -m http.server` renders `/de/` and `/en/quests/` |
| S7 | First `identity.me` sets `dex_id`, second returns the same id, no cookie rewritten |
| S8 | `spike/` deleted; shots and findings untouched; README points at them |
