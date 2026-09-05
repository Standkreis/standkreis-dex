# 🏠📄 [0007] Findings — the Atlas grid, the species page and onboarding (M5)

> Findings of [handoff 0007](0007-atlas-grid-and-species.md). What the spec did not say, one table per track, the checks with evidence, the shots, the doubts.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-05 | Sven Reiser | C1 C3 C4 C5 pass, C2 deferred (Track A) · C6–C9 pass (Track B) · C10 green on `main` after the merge |

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

## 🐦 Track B · species page and "studiert"

### 📐 Decisions the spec did not make

| Decision | Chosen | Why, and what was rejected |
| --- | --- | --- |
| Route in the export | `species/[gbifKey]/page.tsx` is a server shell with `setRequestLocale`; `generateStaticParams` returns `[]` for the server build (renders on demand) and, with `STATIC_EXPORT=1`, every `gbifKey` that has a `Plausibility` row, read from the DB at build time. The page itself is one client component reading `useParams()` | `dynamicParams` cannot depend on an env var (Next wants a literal), so the default (`true`) stays; 1,197 shells per locale, no `out/api` |
| `study.mark` / `unmark` | `upsert` on `(identityId, taxonId)` with `at = now`, `recapPassed = false`; `unmark` is `deleteMany` → `{ removed }`. No XP, no identity write | Re-marking resets `at`: a study is "when you last read it" |
| `taxon.ts` (two additions, nothing changed) | (1) `taxonCard` selects the first image asset as `lead` for look-alikes and interaction targets; `ensure` keeps its own select. (2) `taxon.mapCentre({ regionId })` → `{ name, lat, lng }`: the bbox midpoint of 300 GBIF records inside the GADM unit, via the ETL fetch layer (cached) | `Region` has no geometry (spec §🗄️ E1); GADM's own centroid would need the polygon. The grey/amber/colour tiles need an image, and `page` did not return one for targets |
| Asset order | `createdAt asc` for lead and slider; lead first | The ETL writes iNat first, then the ladder; no `position` column |
| Map | Nine OSM raster tiles at zoom 8 in a 3 × 3 square shifted with `cqw` units so the centre lands mid-card; GBIF density tiles for the species on top at 55 % (`bin=square`, `squareSize=256`, `year=2016,2026`); label "Meldungen seit 2016 · GBIF · Raster ≈ {km} km", the km computed from the latitude; credit line "© OpenStreetMap-Mitwirkende · GBIF"; no "Karte öffnen" | The handoff's "two tiles" cannot centre an arbitrary point without a gap. GBIF's `squareSize` is not pixels: 64 → 9 px, 256 → 33 px on the 512 px tile, ≥ 512 → empty tile (probed). 256 at zoom 8 is ≈ 6 km at 50° N, the coarsest cell GBIF draws that keeps the county in view. **The spec's 10 km cell is the user's own sighting (§⚖️ ladder), which M6 brings**; in M5 the map shows GBIF's reports, labelled as such. No map for an out-of-set taxon: a dense fox map under "hier selten gemeldet" argues with the set |
| Long-press | Pointer events, 500 ms, cancelled on > 10 px move, plus `onContextMenu` (desktop right-click and iOS fallback); `-webkit-touch-callout: none` on the image; a tap on the caption opens the same sheet | No library. The sheet: Autor · Lizenz (link) · Quelle (link), hint line |
| Caption | "Foto: {author} · {licence} · {origin}" under the image at 13 px; origin localised (iNaturalist, Wikimedia Commons, eigenes Foto) | Spec §⚖️: attribution per view, readable |
| State row | `📖 studiert` (amber) · `○ noch nicht studiert`; `✓ entdeckt` (green) · `○ noch nicht entdeckt`, grey circles from `Marks.tsx` | `identity.progress` (Track A) has no seen date; the date lands with M6's sighting |
| Steckbrief | Cells only for facts that exist (`lifespan`, `reproduction` from AnAge, shown verbatim with an "AnAge" sub-line) plus Status = tile name and `IUCN · label`; the missing ones in one faint line "Größe · Zug · Stimme: noch keine Angaben" | An empty card per fact would be six "noch keine Angaben" boxes on most pages |
| Vorkommen | Aside = region name; card with headline ("Ganzjährig anzutreffen" or "Hauptzeit Okt–Nov"), "jetzt gute Chancen" when `now`, 12 bars (height = share ÷ peak, this month in moss), letters, "6.009 Meldungen in zehn Jahren". Out of set: "hier selten gemeldet", no bars, no map. No region: "Noch keine Region gewählt." | The handoff's wording, kept |
| Verwechslungsgefahr | Horizontal row of 210 px cards, thumb 44 px carrying dex state, name (2 lines) and Latin; empty: "Keine Art derselben Gattung in deinem Atlas." | Always in-set (record 0002 E10), so always a link |
| Ökologie | One row per kind in the order eats · eatenBy · pollinates · visitsFlowersOf · hostOf · parasiteOf, labels "frisst · wird gefressen von · bestäubt · besucht Blüten von · Wirt von · Parasit von"; in-set chips link and carry state; out-of-set chips grey, `?`, "nicht in deinem Atlas", no link; 24 chips per row then "+n weitere"; empty: dashed "Für {name} kennt GloBI noch keine Beziehungen. Das heißt nicht, dass es keine gibt." | A row of 200 chips scrolls forever |
| Quellen line | "Quellen · Text: Wikipedia, {licence} · Daten: GBIF[, Wikidata][, AnAge] · Vorkommen: GBIF · Ökologie: GloBI · Bilder: {origins}", each part only when present; Vulpes: "Quellen · Daten: GBIF" | Findings 0002: one line, headers carry no source |
| Fungus notice | Amber card above the intro: "🍄 Kein Speisepilz-Ratgeber. …" plus "Der Einleitungstext stammt aus Wikipedia und ist nicht von uns geprüft." | Spec §⚖️ |
| Sticky bar | Only "Studiert" (amber, full width, `aria-pressed`, "Studiert ✓" and amber-soft when studied) at the safe-area bottom; the Shell tab bar and ＋ are hidden on this page with a sibling selector (`[&~nav]:hidden` on `<main>`) | "Entdeckt" is M6; no Shell edit (Track A's file) |
| English intro marker | "Deutsch, noch keine englische Fassung" / "English, no German version yet" above the intro when the intro language differs from the locale | Handoff C7 |
| Not found | "Diese Art ist noch nicht im Atlas." with a link back to the atlas | — |
| Shot script | `app/scripts/m5/shots-b.mjs <path> <out> [--w] [--h] [--dark] [--full] [--id] [--action longpress|study|caption]`; waits for every image, prints state · sources · study text · attribution links as JSON | CDP, no dependency |

### ✅ Checks

| Check | Result | Evidence |
| --- | --- | --- |
| C6 Amsel page, 390 and 360, light and dark, de and en | ✅ | `0007-shots/b-amsel-{de,en}[-360][-dark].png` (8); Quellen line: "Quellen · Text: Wikipedia, CC BY-SA 4.0 · Daten: GBIF, Wikidata, AnAge · Vorkommen: GBIF · Ökologie: GloBI · Bilder: iNaturalist" |
| C7 fungus notice · English marker · empty facts · out of set | ✅ | `b-fliegenpilz-de.png` (notice above the intro) · `b-fahldrossel-de.png` (Turdus pallidus 2490773, "Englisch, noch keine deutsche Fassung"; also out of set for Mainz-Bingen, so "hier selten gemeldet") · `b-blaumeise-de.png` (all facts missing: "Größe · Alter · Nachwuchs · Zug · Stimme: noch keine Angaben") · `b-vulpes-de.png` (Vulpes vulpes 5219243: no image, no intro, "hier selten gemeldet", no bars, no map, "Quellen · Daten: GBIF") |
| C8 Studiert round trip | ✅ | `b-amsel-de-unmarked.png` → DB `Study` empty, `b-grid-unmarked.png` "0 studiert" · `b-amsel-de-marked.png` → one `Study` row (`at` = now, `recapPassed` false), `b-grid-studied.png` and `b-you-studied.png` "1 studiert". `Identity` row unchanged (no XP column exists) |
| C9 long-press | ✅ | `b-amsel-de-longpress.png`: Bildnachweis · Autor Luiz Lapa · Lizenz CC BY 4.0 → creativecommons.org/licenses/by/4.0/ · Quelle iNaturalist → inaturalist.org/photos/356885346 |
| C10 export build | ✅ (Track B side) | `npm run check` green: typecheck, lint, 3 test files incl. locale parity, `STATIC_EXPORT=1 next build` → 2,407 pages, `out/de/species/*` 1,197 shells, no `out/api` |

### 🤔 Doubts

| # | Doubt | Where it lands |
| --- | --- | --- |
| B1 | The export build needs the DB to enumerate species; a CI without Postgres exports zero species shells (no error, just an empty list) | M8 / deploy |
| B2 | Out-of-set taxa have no export file; on the static host `/species/5219243` is a 404, on the server build it renders | M14 or whoever ships the export |
| B3 | OSM's tile usage policy tolerates light app use but not a busy product; GBIF's map API is open. A tile proxy or a paid tile host before launch | M8 |
| B4 | The GBIF overlay covers the whole card, not just the region; the label says "Meldungen", not "in deiner Region" | Fine for M5; M14 draws the polygon |
| B5 | Vulpes vulpes has dense GBIF cells around Mainz yet is out of the set. Not the page's call: the ETL cut (findings 0006). The page hides the map rather than argue | Owner: is a fox "hier selten gemeldet"? |
| B6 | No seen date in the state row until M6 supplies one via `identity.progress` | M6 |
| B7 | AnAge facts are English strings ("21.8 years (wild)", "mature at 365 days") on the German page | Content job, M4 follow-up |
| B8 | No Kyoto identity exists, so the Kyoto-only species (English intro) render as out of set for the dev identity | Cosmetic for C7 |
| B9 | Hiding the tab bar via a sibling selector couples the species page to the Shell's DOM order | Shell gets a `hideNav` prop when Track A's files reopen |
| B10 | Two additions to `taxon.ts` (`lead` on cards, `mapCentre`) were made because the fields were missing; nothing existing changed | Merge review |
| B11 | `git` and `python3` stopped working mid-session (Xcode licence prompt); the commit uses `/Library/Developer/CommandLineTools/usr/bin/git` | Machine, not the repo |
