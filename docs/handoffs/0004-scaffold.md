# 🏗️ [0004] Handoff — the Next.js scaffold (M2)

> A handoff, not a spec. Child of [spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🏗️, sibling of [0005](0005-etl-grill.md). Read the documents in §⬆️ before anything else; nothing here overrides them.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-04 | Sven Reiser | [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) · [Review 0003](0003-ui-spike-review.md) | 2 sessions, production code |

---

## 🎯 Why

The UI is chosen and the spike is the only runnable reference. Nothing in it is production code, and it must be deleted the moment something better exists. M2 is that something: the real app with the spike's look, no species data, running on the stack the record decided (Q5). It is the trunk that M4 (ETL), M5 (grid and species page) and M7 (identity) branch from, so it must be boring, complete and small.

**Scaffold, not features.** No screen gets built here beyond what proves the plumbing. If a screen from spec §🎨 is tempting, it belongs to M5 or M6.

## ⬆️ Input

| Read | Why |
| --- | --- |
| [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🏗️ §🎨 §⚖️ | Stack, navigation, design language, and the rules the shell already has to embody (dark theme, i18n, attribution per view) |
| [Record 0001](../records/0001-standkreis-dex-the-first-walk.md) Q3 Q5 | Anonymous-first identity, PWA first, Capacitor later. Do not scaffold for Expo, do not scaffold an account form |
| `spike/ui/src/index.css` | The 15 colour tokens, light and dark, with their comments. Port them verbatim |
| `spike/ui/src/components/Shell.tsx` `Marks.tsx` | The bottom bar, the ＋, the two badges. The only spike components worth reading before rewriting |
| `spike/ui/src/types.ts` | The species and sighting shape the mocks rendered; the Prisma schema must be a superset |

## 🛠️ How

| Aspect | Choice | Why |
| --- | --- | --- |
| Where | Repository root: `app/` for Next.js, `packages/` only if a second package appears. `spike/` stays until the last check in §🧪 passes, then is deleted in the same commit | One codebase, record Q5 |
| Stack | Next.js App Router, TypeScript strict, Tailwind 4 with the spike's tokens, tRPC, Prisma, Postgres via Docker Compose for dev | Spec §🏗️, no substitutions |
| Static export | `output: 'export'` must stay possible: no server components that need a Node runtime at request time, API only through tRPC routes that can move to a separate host | Capacitor wraps the static export (Q5) |
| PWA | Manifest, icons placeholder, service worker registered but caching nothing yet | Offline is M8; the registration point has to exist now |
| i18n | `de` and `en` from the first string, keys not sentences, `de` the source of truth for vocabulary (studiert · entdeckt) | Spec §🏗️ Language row. Pick one library and one file layout; do not write a custom one |
| Theme | Light default, dark via `prefers-color-scheme`, tokens as CSS variables like the spike. No toggle | Findings doubt 34: follow the system until someone asks |
| Shell | Bottom bar Dex · Quests · ＋ · Tagebuch · Du with the stroke icon set, ＋ opens a placeholder sheet. Each tab renders a page with its title and one "kommt bald" line | Proves routing, theme, i18n and the bar in one screen each |
| Schema | Prisma models for `Identity`, `Filter`, `Taxon`, `Sighting`, `Study`, `Plausibility`, `Interaction`, `Asset` as the spec's ER diagram, plus `licence` and `attribution` on `Asset`. Migrations run; nothing seeded except one dev identity | The ETL (M4) writes into this; getting the shape wrong there is expensive, here it is cheap |
| Identity stub | A cookie-bound anonymous `Identity` minted on first request, nothing else | M7 builds on it; the scaffold needs it so tRPC calls have a subject |
| Quality gates | `typecheck`, `lint`, `test` (Vitest, one test), `build` with static export, all green in one `npm run check` | The first CI job, whenever CI exists |
| Docs | `README.md` at the root: what it is, how to run, links to spec and record. `docs/` untouched | The repo is public later |

## 🧪 Checks

| # | Check | Pass looks like |
| --- | --- | --- |
| S1 | `npm run check` is green from a clean clone with Docker running | Typecheck, lint, one test, static build |
| S2 | The shell at 390 × 844 matches the spike's bar shot | [grid bar](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a.webp), bottom 90 px; same icons, same raised ＋ |
| S3 | Dark holds | `prefers-color-scheme: dark` swaps every surface; no hard-coded light colour in the shell |
| S4 | Language switches | Every visible string comes from a key; switching the locale changes all of them; `de` and `en` files have the same keys |
| S5 | The schema is a superset of the spike | Every field in `spike/ui/src/types.ts` has a column or a derivation; `Asset` carries `author`, `licence`, `sourceUrl` |
| S6 | Static export works | `next build` with `output: 'export'` produces a folder that serves the shell from a plain file server |
| S7 | Anonymous identity survives a reload | Cookie set on first request, the same id on the second, no login anywhere |
| S8 | The spike is gone | `spike/` deleted, shots and findings untouched, `README` says where the reference screenshots live |

## ⬇️ Output

| Deliverable | Lands |
| --- | --- |
| The app | `app/`, runnable with `npm run dev`, `npm run check` green |
| Schema | `app/prisma/schema.prisma` and the first migration |
| Tokens and shell | `app/src/styles/tokens.css`, `app/src/components/Shell.tsx` |
| Locales | `app/src/i18n/de.json` `en.json` |
| README | root |
| Findings | Short: what was decided that the spec did not say (i18n library, folder layout, icon set), as `0004-scaffold-findings.md`, one table |
| Spike | Deleted in the final commit of M2 |

**Definition of done:** S1 to S8 pass, the spec §🏗️ needs no edit, and M4, M5 and M7 can start on separate branches without touching each other's files.

## 🚫 Not in this handoff

Any species data or fixture (M4) · the grid, species page, log flow, fill (M5, M6) · passkeys, sync, export, delete (M7) · offline caching (M8) · Capacitor · CI hosting · a brand or a name beyond the placeholder.

## 👉 Start the session with

```
Read docs/handoffs/0004-scaffold.md and the two documents it names first in §⬆️.
Scaffold app/ as §🛠️ describes: stack, tokens, i18n, shell, schema, identity stub, npm run check.
Stop after the shell renders in both themes and both languages, and show me before writing the schema.
```
