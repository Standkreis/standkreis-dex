# 🏠📄 [0007] Findings — the Atlas grid, the species page and onboarding (M5)

> Findings of [handoff 0007](0007-atlas-grid-and-species.md). One section per track; the merge joins them.

## 🛠️ Track A · onboarding, grid, drawer

Branch `m5-grid`. Shots in [`0007-shots/a-*`](0007-shots/), driver scripts `app/scripts/m5a/onboarding.mjs` and `grid.mjs` (headless Chrome over CDP, no dependency, as findings 0004).

### 🗳️ Owner decisions during the session (2026-09-05)

| Decision | Choice |
| --- | --- |
| New regions | **None for now.** The onboarding lists every GADM-2 hit but only regions with a `ready` row (Mainz-Bingen, Kyoto) can be chosen; the rest carry "Noch nicht verfügbar". `dex.requestRegion` stays in the router, unreachable from the UI until the whole loop (M6) stands |
| Splash photo | Stays the Grünspecht (Andrea Poggi, CC BY 4.0, iNaturalist) |
| Tile count | "{n} Arten" / "{n} species", no "hier" |

### 📐 What the spec did not say

| Topic | Decision | Why |
| --- | --- | --- |
| Search matching | Case and diacritics folded (`ß` → `ss`), **prefix or word-prefix** on every common name and the Latin name, never substring. Rank: name shown under the cell starts with the query → first; any other name or word → second; inside a rank the active sort holds | "amsel" must not find the damselflies; "blackbird" must find *Common blackbird* by its second word |
| Sort tie-breaks | *Jetzt wahrscheinlich* = the server order (`nowRatio` desc, then `obs`). *Name* = display name by `localeCompare(locale)`, then Latin name. *Zuletzt entdeckt* = latest wild sighting desc, unseen species after in server order | One stable order per sort, nothing hidden |
| What the badge counts | Any tile off = 1, Zeigen ≠ Alle = 1, "nur jetzt" = 1. **Sort is not counted**: it orders, it does not narrow. C4's four choices read **3** | The spec says "count of active filters"; a badge "1" for a sort with all 929 cells shown would lie. Owner's session note listed sort as active; this deviates, see doubts |
| Where state lives | Region and tiles in `Filter` through `identity.setFilter` (written on every chip tap, optimistic). `?show` `?sort` `?now` `?q` in the URL by a plain `history.replaceState` so `useSearchParams` follows and back restores them | Handoff table; the query joined the three because back from a species page should show the same result list |
| `Filter.nowOnly` | Mirrored from the chip on every tiles write, never read by the grid | The URL is the truth for the chip; the column exists and stays consistent for Profil later |
| One read for everything | `dex.set` for **all tiles, whole year**; tiles, chip, state and search are applied on the client. `useAtlasSet` / `countersOf` in `AtlasCounters.tsx` feed the grid header and `IdentityCounters` alike | One cache entry, chips toggle without a refetch, both screens show the same three numbers |
| "nur jetzt" chip placement | In the Region row, worded "nur jetzt · September" | It is the where-and-when context the old header line carried; no Zeitraum section |
| Ändern | `/onboarding?change=1`: the same three screens, a Cancel on the region screen, the tiles screen seeded from the current filter | A region change changes the tile counts and whether fish shows, so the tiles screen is not skipped |
| Bar with two axes | Green = entdeckt, amber = studiert − both (doubt 19 as accepted). A non-zero segment floors at 2 % | 3 of 929 is 0.3 %: the first find would be invisible |
| Empty lines | Search: "Nichts gefunden für „{q}“." Filters: "Keine Art passt zu diesen Filtern." No backbone hint | Handoff C5; backbone search is M6 |
| No image | Group silhouette in the cell instead of an emoji | Findings 0002 revision 3 |
| en vocabulary | `dex.seen` was "{n} seen", now "{n} discovered" like `you.seen` and the onboarding | One word per axis in en too |
| `identity.progress` | Gains `seenAt: Record<taxonId, ISO>` (latest wild sighting); `seen` unchanged | The sort needs a date; Track B's reads are unaffected |
| Last tile | Cannot be switched off | An empty set is not a filter |

### 🧪 Checks

| # | Result | Evidence |
| --- | --- | --- |
| C1 | ✅ | Fresh identity → grid by text "Bingen" in **7.7–8.1 s** (five runs), `Filter` row set, 929 cells, region already `ready` |
| C2 | ⏸️ **deferred** | No region requested (owner): the full loop first, then M8's queue. UI shows unprepared hits as not selectable, shot `a-onboard-1-region-unavailable-de-light.png` (Trier-Saarburg, Trier) |
| C3 | ✅ | 929 cells, "5 studiert · 3 entdeckt · 929 möglich" (seeded test identity), no badge. Shots `a-grid-*`, `a-scrolled-*`, `a-drawer-*` at 390 de/en × light/dark and 360 de light; `a-grid-states-de-light` with the three cell states. Parity test passes, 25 new keys per language |
| C4 | ✅ | "nur jetzt", all tiles, September: **364** (= the SQL count, ± 0). Reptiles off: 929 → 924 möglich; Zeigen Studiert + sort Name leave the counters at 924; badge **3**; URL `?now=1&show=studied&sort=name`; first cells Amsel · Hornisse · Rotmilan · Tagpfauenauge. Back from `/you` (client-side): URL, scroll (900 → 900), reptile off, sort Name, chip on all restored. Reset → 929, URL `/de` |
| C5 | ✅ | de: "amsel" → 1 (Amsel), "turdus" → 3 (Amsel, Singdrossel, Wacholderdrossel), "blackbird" → 1. en: "blackbird" → Common blackbird first, "turdus" → Common blackbird, Song thrush, Fieldfare. "xyzzy" → one line, no hint |
| C10 | ✅ | `npm run check` green (typecheck, lint, 26 tests, export); `out/` has `de/`, `en/`, `onboarding/`, no `api/` |

### ❓ Doubts

| # | Doubt | Proposal |
| --- | --- | --- |
| A1 | **Badge and sort.** The owner's note counted a non-default sort as active; the build does not, so C4 reads 3 as written. If the owner wants 4, it is one term in `AtlasGrid.tsx` (`active`) | Keep 3; a sort is not a filter |
| A2 | **929 tiles at 45 %.** The light grid is a pale wall (doubt 44 stands); the studied and found cells sit where the sort puts them, often below the fold | Decide on a phone in sunlight; a "Zuletzt entdeckt" default sort would surface progress but hide "jetzt" |
| A3 | **The test identity.** `grid.mjs seed` writes `Study` and `Sighting` rows straight into the dev database for one identity, because `study.mark` is Track B's and the log flow is M6 | Delete after the merge or keep as the owner's demo identity |
| A4 | **Region change loses nothing but asks twice.** Ändern walks all three screens | Fine for slice one; a one-screen picker when a third region exists |
| A5 | **Dev-server 404s.** The first request after a recompile sometimes returns Next's 404; `grid.mjs` navigates twice | Not a product bug; note for whoever scripts against `next dev` |
