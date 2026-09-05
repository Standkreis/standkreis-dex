# 🏠📄 [0007] Handoff — the Atlas grid, the species page and onboarding (M5)

> A handoff, not a spec. Child of [spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🎨 1 2 3, §🏗️ and [record 0002](../records/0002-etl-the-plausible-set.md). Read the documents in §⬆️ before anything else; nothing here overrides them.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-05 | Sven Reiser | [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) · [Findings 0002](0002-ui-exploration-findings.md) · [Findings 0006](0006-etl-and-identity-findings.md) | 1 session: two agents in parallel worktrees, production code |

---

## 🎯 Why

M4 filled the tables and M7 made the identity durable. Nothing on screen uses either yet beyond a preview. M5 is the first milestone the owner can *walk with*: pick a region, see what could be found, read up on one species, mark it studied. It is also the first time the spec's chosen mocks meet real data, so the honest empty states matter as much as the happy path.

**The seed is already on `main`.** Commit `24e72b5` replaced the home placeholder with [`AtlasGrid.tsx`](../../app/src/components/AtlasGrid.tsx): the real set of the identity's region as a 3-column greyscale grid, a "nur jetzt" toggle in the header, the counters from `identity.progress`. It is a slice, not the milestone: the toggle sits in the wrong place, there is no drawer, no search, no species page, no onboarding. Start from it, do not restart.

## ⬆️ Input

| Read | Why |
| --- | --- |
| [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🎨 1 (onboarding), 2 (grid), 3 (species page), §🏗️ navigation, §⚖️ attribution | The chosen screens, with links to the reference shots; the rules on captions and the sources line |
| [Findings 0002](0002-ui-exploration-findings.md) §1 §2 §3, revisions 2 and 3, doubts 1 2 3 6 13 14 19 21 42 43 45, vocabulary and badge rules | Everything the owner decided on the mocks, and what was rejected |
| [Findings 0006](0006-etl-and-identity-findings.md) Track A table, C3 | The shapes of `dex.set` and `taxon.page`, `nowRatio`, `words`, the image ladder, why Kyoto has 109 English intros |
| [Record 0002](../records/0002-etl-the-plausible-set.md) E2 E8 E10 E13 | Month is a sort and a chip, no Lebensraum, look-alikes are same-genus siblings, out-of-set species |
| [Findings 0004](0004-scaffold-findings.md) | Tokens, i18n routing, tRPC client, the shot script for parity checks |
| Reference shots in [`docs/adr/0001-…/`](../adr/0001-standkreis-dex-the-first-walk/) | `0002-onboard-*`, `0002-grid-a*`, `0002-species-p1-amsel*`, `0002-species-p1-empty-state`, `0002-species-p1-facts-empty`, `0002-species-p1-fungus-notice` |

## 🌱 What is already there

| Piece | Where | State |
| --- | --- | --- |
| Grid cells, three states, badges, sources line | `AtlasGrid.tsx` | Done as the spec draws them; keep |
| Counters over the set | `AtlasGrid.tsx`, `IdentityCounters.tsx` | Both compute the same three numbers; make one hook |
| "nur jetzt" | header button | Moves into the drawer as a chip; the header loses it |
| `dex.set`, `dex.regions`, `taxon.page`, `taxon.ensure`, `identity.progress` | routers | Pure reads, no change expected |
| `Filter` row | schema | Exists, has no mutation yet: nobody can set a region from the app |
| `Study` row | schema | Exists, has no mutation yet |

## 🛠️ Track A · onboarding, grid, drawer

| Aspect | Choice | Why |
| --- | --- | --- |
| Files owned | `app/src/app/[locale]/page.tsx`, `app/src/app/[locale]/onboarding/**`, `app/src/components/Atlas*`, `app/src/components/Onboarding*`, `app/src/components/FilterDrawer*`, `app/src/server/routers/identity.ts` (one mutation `setFilter`), `app/src/server/routers/dex.ts` (one mutation `requestRegion`) | Track B never opens these |
| Onboarding | Three screens as spec §🎨 1: splash with a real Commons photo and caption, region (geolocation explained *before* the OS prompt, "Ort eingeben" fallback), tiles all on, ready screen with the month count and nine grey cells. Lands on the grid | The reviewed mock; no skip on the tiles screen |
| Region lookup | Text: GBIF `geocode/gadm/search` as the ETL's `resolveRegion` does, level 2 only. Point: GBIF `geocode/reverse?lat&lng`, take the `GADM2` layer. Both from the server, one `dex.lookupRegion` query | One source for both paths; the ETL already speaks it |
| New region | `dex.requestRegion({gadmGid})` upserts the `Region` row `queued` and starts `runRegion` **in-process, not awaited**, then the content job. The grid shows "`<name>` · wird vorbereitet" and polls `identity.me` every 5 s until `ready` | A queue is M8; two minutes of "wird vorbereitet" is honest for slice one. A failed job shows the error line and a retry |
| `identity.setFilter` | `{regionId, tiles[], nowOnly}` upsert on the identity's `Filter` | The only write; the grid and Profil read it back through `identity.me` |
| Header | Title, then one bar amber-then-green with "12 studiert · 8 entdeckt · 22 möglich". **No grid · list · map toggle** in M5: it is M14, and a disabled control is a promise | Doubt 32's rule: rows for unbuilt things rot |
| Search and filter | One bar: a search field over the set (names in both languages and the Latin name, client-side over `dex.set`) and a filter button showing only the count of active filters. Once the bar scrolls away, a bottom-right button opens the same drawer with the search field on top | Findings 0002 revision 2. Backbone search is M6 |
| Drawer | Bottom sheet: Region (current name, "Ändern" reopens the region screen), Gruppen (eight tiles, fish hidden when the region has none), Zeigen (Alle · Studiert · Entdeckt · Noch nicht entdeckt), Sortierung (Jetzt wahrscheinlich · Name · Zuletzt entdeckt), the chip "nur jetzt". **No Zeitraum** | Spec §🎨 2, record 0002 E2. Region and tiles persist through `setFilter`; state, sort and the chip persist in the URL query so back restores them |
| Back restores | Filter from the URL, scroll position through the router's scroll restoration; verify on the species page round trip | Findings 0002 §3 requirement |
| Cell tap | Navigates to `/[locale]/species/[gbifKey]` | Track B's page |

## 🛠️ Track B · the species page and studied

| Aspect | Choice | Why |
| --- | --- | --- |
| Files owned | `app/src/app/[locale]/species/**`, `app/src/components/Species*`, `app/src/server/routers/study.ts` (new, one line in `_app.ts`) | Track A never opens these |
| Page | Full page from `taxon.page` as spec §🎨 3: image slider with the caption under it, three names, the state row (📖 studiert · ✓ entdeckt · date), intro, Steckbrief (Größe · Alter · Nachwuchs · Zug · Status · Stimme), Vorkommen (year strip in words and bars, OpenStreetMap tile pair with the coarse cell), Verwechslungsgefahr, Ökologie chip rows by kind, one Quellen line. Fungus notice above the intro | The reviewed mock |
| Honest empty states | A section with no data shows one grey line ("Noch keine Angaben"), never a heading over nothing. Intro in English carries "Englisch, noch keine deutsche Fassung". Out-of-set species: no bars, "hier selten gemeldet" | Findings 0002 doubts 8 21, record 0002 E13; Kyoto has 109 English intros and Mainz-Bingen 167 species without facts |
| Map | Two OSM raster tiles at zoom 9 around the region centroid with the 10 km cell drawn on top; static `<img>`, attribution line | The mock; no map library, no interaction until M14 |
| Sticky bar | **"Studiert" only.** "Entdeckt" jumps to the save screen, which is M6; until then the bar has one button | Same rule as the toggle: nothing on screen that leads nowhere |
| `study.mark` | `{taxonId}` upserts `Study` with `at = now`, `recapPassed = false`; `study.unmark` deletes it. No XP | Spec §🧬: studied earns nothing until the recap (M11) |
| Look-alike and ecology tiles | Carry dex state from `identity.progress`; a target outside every set is a grey tile "nicht in deinem Atlas" | Findings 0002 §3 row 3 |
| Attribution | Caption under every image at readable size; long-press opens author · licence · source | Spec §⚖️ per view, doubt 42 |

## 🔀 Working in parallel

| Rule | Why |
| --- | --- |
| Two worktrees, `m5-grid` and `m5-species`, both from `main` at the commit after this handoff lands | No file overlap by the ownership rows |
| Shared files: `_app.ts` (B adds one router line), both locale JSON files (each track adds its own keys under `dex`, `onboarding`, `species`). Conflicts there are resolved by taking both | Everything else conflicting is a rule violation |
| The one hook for the three counters lives in Track A's `Atlas*`; Track B reads `identity.progress` directly | B must not wait for A |
| Track A merges first, B rebases, `npm run check` on `main` | A owns the home route B links back to |
| Neither track edits `schema.prisma`, `docs/specs/`, `docs/records/`, or the ETL | The schema holds `Filter` and `Study` already; a needed change stops the track |

## 🧪 Checks

| # | Track | Check | Pass looks like |
| --- | --- | --- | --- |
| C1 | A | Fresh identity, onboarding by text "Bingen", tiles unchanged | Under a minute to the grid; `Filter` row set; region already `ready` from the seed, so no wait |
| C2 | A | Onboarding by text "Trier-Saarburg" | "wird vorbereitet" with the name, the grid fills within 3 minutes without a reload; a second identity choosing the same region waits on the same job |
| C3 | A | Grid at 390 × 844 and 360, both themes, both languages | Parity with `0002-grid-a*` minus the view toggle; every string from a key |
| C4 | A | Drawer: reptiles off, Zeigen = Studiert, sort = Name, chip on | Counters change only with tiles; the badge says 3; back from a species page restores all four and the scroll offset; "nur jetzt" in September shows 364 ± 5 |
| C5 | A | Search "amsel", "turdus", "blackbird" (en locale) | Amsel first in all three; empty result shows one honest line, no backbone hint |
| C6 | B | Amsel page at 390 and 360, both themes, both languages | Parity with `0002-species-p1-amsel*`; Quellen line names GBIF, Wikidata, Wikipedia, iNaturalist or Commons, GloBI, AnAge as present |
| C7 | B | Fliegenpilz, a Kyoto species with an English intro, a species with empty facts, an out-of-set taxon | Notice above the intro; the English marker; one grey line per empty section; "hier selten gemeldet" with no bars |
| C8 | B | Mark Amsel studied, open the grid | Amber ring and 📖 on the cell, "1 studiert" in the header and on Profil; unmark reverts; no XP anywhere |
| C9 | B | Long-press the lead image | Author, licence with link, source with link |
| C10 | all | `npm run check` on `main` after both merges; static export builds | No `api/` in `out/`; the onboarding and species routes render statically with the client fetching |

## ⬇️ Output

| Deliverable | Lands |
| --- | --- |
| Screens | `/[locale]/onboarding`, `/[locale]` (grid with bar and drawer), `/[locale]/species/[gbifKey]` |
| Mutations | `identity.setFilter`, `dex.requestRegion`, `dex.lookupRegion`, `study.mark`, `study.unmark` |
| Findings | `0007-atlas-grid-and-species-findings.md`: one table per track with what the spec did not say (search matching rule, sort tie-breaks, polling, map tile choice, empty-state wording), C2 and C4 numbers, shots |
| Roadmap | M5 marked ✅ with the date; M6 marked next |
| Spec | Only if a mock had to change: a dated note in §🎨, nothing silent |

**Definition of done:** C1 to C10 pass, and the owner can go from a fresh browser to a studied Amsel without reading this document.

## ❓ Open, for the owner during the session

- **Sort options.** The drawer mock shows "Jetzt draußen zuerst". Proposal: Jetzt wahrscheinlich · Name · Zuletzt entdeckt, nothing else in slice one.
- **Splash photo.** One Commons photo with caption, chosen once. Proposal: a Mainz-Bingen species with a CC BY photo from the seed, picked by the owner from three candidates the agent shows.
- **In-process region job.** Fine for one owner on one laptop; not fine on a host that sleeps. Accepted for M5, M8 replaces it. **Owner, 2026-09-05: no new regions until the full loop is closed.** Mainz-Bingen and Kyoto only; unknown regions show as not yet available; C2 deferred.
- **Splash photo (owner, 2026-09-05):** Grünspecht, Andrea Poggi, CC BY 4.0. Tile counts read "{n} Arten" without "hier".

## 🚫 Not in this handoff

Log flow, fill sheet, Tagebuch, backbone search, "Entdeckt" from the species page (M6) · offline (M8) · XP, recap, quests (M10, M11) · list and map views (M14) · email attach (M7b) · share cards (M13) · any schema change · any ETL change.

## 👉 Start the session with

```
Read docs/handoffs/0007-atlas-grid-and-species.md and the three documents it names first in §⬆️.
Open two worktrees from main and run Track A and Track B as two agents in parallel, each owning only its files.
Stop Track A after C1 and show me the onboarding screens before it builds the drawer.
```
