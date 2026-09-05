# 💬 [0002] Grilling — the plausible set is a region's whole year, cut per tile, and the month is a sort

> **Immutable.** A reversal is a new record that supersedes this one; a refinement is a dated
> entry under 📎 Addenda. The body above that line never changes.

| 🗓️ Date | 👤 Participants | 🤖 Model |
| --- | --- | --- |
| 2026-09-05 | Sven Reiser, with Claude Fable 5.1 | claude-fable-5-1 |

## ⬆️ Input

- [Handoff 0005](../handoffs/0005-etl-grill.md): thirteen questions E1 to E13, a probe to answer them with real numbers, a grill to decide.
- [Record 0001](0001-standkreis-dex-the-first-walk.md) Q2 and Q7, §📌 "the threshold is the product"; [spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🧬 and §🗄️ as they stood before this grill.
- [Findings 0002](../handoffs/0002-ui-exploration-findings.md) doubts 3, 8, 13, 16, 20, 21, 22, 43, parked for the ETL.
- The probe: `scripts/etl-probe/`, eight throwaway Node scripts, ~7,000 cached API responses, zero rate-limit errors. Tables in [findings 0005](../handoffs/0005-etl-grill-findings.md).
- Regions: **Mainz-Bingen** (GADM `DEU.11.19_1`, the owner's Saturday) and **Kyoto city** (GADM `JPN.22.13_1`, the owner's pick for E12).

## ⬇️ Output

- **Spec:** [spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🧬 "The plausible set" and §🗄️ rewritten, new §🗃️ ETL.
- **Findings:** [0005-etl-grill-findings.md](../handoffs/0005-etl-grill-findings.md), with the first real fixture `scripts/etl-probe/out/fixture-mainz-bingen.json` (929 species, month shares, names, images).
- **Doubts:** 3, 8, 13, 16, 20, 21, 22, 43 answered in findings 0002 §✅.
- **§4 recommendation:** proceed to **M4, the ETL**, from spec §🗃️. No open question blocks it.

## 🎯 Facts

What the probe measured, and the decision each moved.

| Fact | Source | Moved |
| --- | --- | --- |
| Mainz-Bingen, September, 2016–2026: 15,553 observations, 1,344 species; ≥5 → 393, ≥10 → 217, ≥20 → 136. Birds are 55 % of the ≥20 list; Nosferatu-Spinne ranks 4th, above Amsel; Brennnessel has 9 records, Rotbuche 5 | GBIF facets, `cells.mjs` | E2 — a flat count measures observer effort, not findability |
| The same region over the whole year: 237,740 observations, 5,250 species; the September set loses Brombeere, Eiche, Holunder and every fungus but three | `year.mjs` | E2 — membership on the year |
| A 10 km grid over the Landkreis is 19 cells, 5 with their centre inside; the union has 78 % more species than the polygon (Mainz, Wiesbaden, Rheingau). 5 km: 49 cells, +54 %. One polygon call takes 5–8 s, one cell call 20–35 s | `cells.mjs` E1 | E1 — no grid |
| GBIF exposes GADM level 2 as a facet parameter for every district on Earth | GBIF API | E1 — the Landkreis is the unit |
| Twelve monthly facet calls per region return the whole species × month matrix; a per-species call is never needed | `matrix.mjs` | E3 · E11 |
| Normalised by monthly effort, 9 of 10 test species match local knowledge (Mauersegler Mai–Jul, Kranich Feb + Okt–Dez, Schneeglöckchen Feb–Mär, Hirschkäfer Jun–Jul, Fliegenpilz Okt–Nov). The miss is C-Falter's second generation at 0.10 of its March peak | `cells.mjs` E3 | E3 — shares, not curves |
| iNaturalist research grade is one GBIF dataset (11 % here, 34 % in Kyoto). iNat alone has 42 species at ≥10 in September against GBIF's 217 and lacks 40 of them, among them Grünspecht, Feldhase, Goldammer | `cells.mjs` E4 | E4 — GBIF alone |
| 35 of 931 species fit none of the seven tiles: 22 spiders, 11 snails, a woodlouse, a house centipede. Nosferatu-Spinne is the most recorded animal in the region in September | `groups.mjs` | E5 — widen the insect tile |
| Kyoto's set holds 16 river fish (Karpfen, Koi, Medaka, Wels); GBIF's backbone gives ray-finned fishes no class, only orders | `year.mjs` Kyoto | E12 — a fish tile |
| GBIF's species facet folds subspecies, varieties and forms; 1,942 of 3,545 taxa at ≥10 are genus-or-higher records with no species key | `groups.mjs` | E6 — species only, for free |
| Wikidata P846 matches 874 of 931 (94 %); 55 of the other 57 by exact name search. One item is a genus (Draba verna), two keys have two items | `groups.mjs` | E6 — the four rules |
| Wikidata's German labels for taxa are the scientific name by convention; the de.wikipedia sitelink title carries the vernacular | `cells.mjs`, spot check Q25485 Kohlmeise | E6 — names from the sitelink |
| Commons P18 exists for 92 %; 52 % landscape, 27 % portrait, 9 % under 600 px; 19 confirmed mounted specimens and 1885 botanical plates (Kohlweißling, Waldrebe, Wegwarte, Bärlauch). iNat has a default photo for 100 % of a 120-species sample, 84 % under CC0/BY/BY-NC, always a live organism, already square | `assets.mjs` | E7 — iNat first |
| de.wikipedia intro 87 %, en 86 %, IUCN 22 %, AnAge 16 %, Wikidata habitat 1 %, mass 5 %. EOL's public pages API returns no traits and rate-limits at 3 in flight; TraitBank and the IUCN API need tokens | `coverage.mjs`, Wikidata SPARQL | E8 — drop Lebensraum |
| GloBI has at least one edge for 100 % of a 258-species sample across all tiles (96 % in Kyoto); common birds hit the 1,000-edge cap, a grass moth has 14. `interactsWith` and `adjacentTo` are among the largest kinds | `coverage.mjs` | E9 — prune, don't fill |
| Same genus within the set: 358 of 931 species have a regional look-alike (birds 19/69, insects 134/396, plants 198/388, mammals 0) | `year.mjs` | E10 — siblings ∩ set |
| One region's first content fill is ≈ 5,700 calls, bounded by iNat at 1/s ≈ 20 min; ten regions ≈ 31,000 calls with iNat at 51 % of its daily cap once | `budget.mjs` | E11 |
| Kyoto: 99,043 observations, set of 303. German names 48 %, English 94 %, Japanese 81 %; intro de 44 %, en 78 %; images and GloBI at Mainz-Bingen levels | Kyoto runs | E12 — the thin part is language |
| Fuchs and Wildschwein have no GBIF observation in Mainz-Bingen in ten years | `year.mjs` | E13 — the set is not the fauna |

## 🗳️ Decisions

Legend: 🙋 = the human overrode the agent.

| # | Question | Decision | Builds on |
| --- | --- | --- | --- |
| E2 | Threshold | 🙋 **Membership is the region's whole year, cut per tile:** the species that make up 90 % of the tile's observations, floor 10 records, window last ten years, observation records only. Month never decides membership | Q2, reversed in part |
| E1 | Cell size | **No grid.** One region = one GADM level-2 polygon. The 10 km cell survives only on the species map and the location ladder | E2 |
| E3 | Month | **Share of the region's observations that month**, from twelve facet calls. Sort "jetzt wahrscheinlich" = share ÷ peak. Chip "nur jetzt" = ≥ 25 % of peak. Year strip: all months ≥ 10 % of peak → "Ganzes Jahr", else the runs of months ≥ 25 % | E2 |
| E4 | Sources | **GBIF alone** for the set. iNaturalist stays for photos and later export | E2 |
| E5 | Groups | Seven tiles from GBIF ranks; **Insekten becomes Insekten & Spinnen** = Animalia minus Chordata | E2 |
| E6 | Rank and matching | Species only from the species facet · Wikidata by P846, then exact name with rank check · non-species item → take nothing from it · two items → the one with a dewiki sitelink · German name from the dewiki title | E5 |
| E7 | Images | **Ladder:** iNat default photo if CC0/BY/BY-NC → Commons P18 unless specimen/plate/larva/egg/map by filename or category → next licensed iNat photo → group icon. Attribution stored per image | Q6, Q7 |
| E8 | Text and facts | Intro from Wikipedia **de → en → honest empty**, language marked · Status from Wikidata P141 · Alter and Nachwuchs from AnAge where linked · **Lebensraum dropped** until a keyed source lands | Q7 |
| E9 | Interactions | Keep eats/eatenBy (+ preysOn), pollinates, hostOf, parasiteOf, visitsFlowersOf; drop interactsWith, adjacentTo. Out-of-set targets render as the grey tile | Q7 |
| E10 | Look-alikes | **Same genus within the region's set**, computed in the ETL | E2, E5 |
| E11 | Refresh | Plausibility: 13 GBIF calls per region, monthly, cached 30 days, region activated by its first user, queued. Content: once per species when it first enters any set, never expires. One worker, 1/s iNat, 4 in flight GBIF, URL-keyed disk cache | E1, E3, E4 |
| E12 | Global honesty | Kyoto on file. **Eighth tile 🐟 Fische** = Chordata outside the four classes and Aves, off by default, shown only when the region's set has any. UI line per region: share of species with text only in English | E5, E8 |
| E13 | Outside the set | A sighting outside the set joins the user's dex and queues content like a set member; it never enters the region's set; no month bars, "hier selten gemeldet"; denominator unchanged | Q1, Q2, E11 |

## 🔥 Reasoning

**E2 — the whole year, per tile.** 🙋 The agent brought three flat cuts and proposed a per-group threshold; the owner reframed the question: whether a species is out this month is a filter or a sort, not membership. The data agrees on three counts. A month-scoped set makes a discovered Mauersegler vanish from the grid in September, which is the one thing a collection must never do. The denominator would lurch from 60 in May to 22 in September, and progression needs a stable base. And September plant data is Pl@ntNet roadside weeds, fungi are 51 records, while the year brings Brombeere, Eiche and Fuchs back. The per-tile cut is what makes the year list a curation and not "everything": 90 % of a tile's observations is invariant to how many birders outnumber botanists, and the floor of 10 keeps single-observer species out. **Rejected — flat count across groups:** measures observer effort; 55 % birds at ≥20, Nosferatu-Spinne above Amsel. **Rejected — 0.5 % of tile effort:** the agent's own first proposal, withdrawn a message later because it scales with effort and collapsed insects to 43 of 675 on the year. **Rejected — 80 % or 95 %:** 622 species felt like a birders' list, 1,171 like a checklist; 931 is where the owner said yes. **Rejected — record Q2's "everything":** unchanged reasoning, a dex of unfillable silhouettes has no pull; 931 with tiles and a sort is not everything.

**E1 — no grid.** Cells were the spec's assumption because the species map shows one. For membership they are wrong twice: the union spills 78 % across the Rhine into Mainz and Wiesbaden, and each cell call costs four times a polygon call and there are 19 to 49 of them. GADM level 2 is what the user picks, what GBIF indexes and what exists for every country. **Rejected — 10 km cells with the Landkreis as a label** (doubt 13's compromise): the label would lie about a third of the list. **Rejected — 5 km cells:** still +54 %, 49 calls. **Accepted cost:** a user on the edge of Mainz-Bingen sees nothing from Mainz city; the fix if it hurts is a second region, not a grid.

**E3 — shares, not curves.** Raw monthly counts are useless because May has four times December's observers; dividing by the month's total fixes that with no model. Three rules on the share produced words a local recognises for nine of ten test species and shows its one miss honestly on the bars. **Rejected — fitted phenology curves:** smooth the C-Falter case but invent shapes for the 800 species with fewer than 50 records. **Rejected — a looser 15 % chip:** offered, declined; the owner took 25 % and 10 % as proposed.

**E4 — GBIF alone.** iNaturalist's research-grade layer is already inside GBIF; "both" double counts it and adds only the needs-ID long tail, the one layer nobody vouched for. The refresh budget drops to zero iNat calls for the set. **Rejected — iNat needs-ID as a low-weight signal:** 241 species in September, all unconfirmed, 2 at ≥10. **On record:** where iNat is the only recorder, GBIF still has it; Kyoto (34 % iNat) confirmed.

**E5 — widen, don't add.** The 35 tile-less species include the most recorded animal of the region; dropping them silently was the worst option and an eighth "Andere" tile is too thin to pick during onboarding. **Rejected — a pure insect tile plus "Andere".** Amended by E12 for fish, where the same test failed the other way: 16 fish in Kyoto is a tile, not an afterthought.

**E6 — GBIF is the taxonomy of record.** The species facet already folds subspecies, so "species only" costs nothing. Wikidata is a name-and-link service, never a name authority: P846 first, name search second, and a non-species item contributes nothing rather than a wrong image. **Rejected — Catalogue of Life through ChecklistBank as backbone:** the occurrence facets are keyed on GBIF; a second taxonomy is a mapping table before a single page exists.

**E7 — iNat first.** Wikidata prefers the herbarium sheet and the 1885 plate for plants; iNat's community already picked a live field photo for every species and cropped it square. The ladder puts that first and keeps Commons for the 15 % where iNat's photo is all-rights-reserved. **Rejected — Commons first:** a quarter of plant tiles would be engravings. **Rejected — an image quality model:** a project on its own. Doubt 43's per-species crop remains content work; the ladder shrinks how much.

**E8 — drop the empty row.** Every open habitat source is either keyed or empty: Wikidata 1 %, EOL public API none, TraitBank and IUCN behind tokens. An empty row on 99 % of pages is not an honest empty state, it is a broken one. **Rejected — request the free tokens now:** possible, but "no key that is not free" was the rule of this grill and M4 can add them without a new decision. The intro fallback to English came from Kyoto, where German covers 44 %.

**E9 — prune.** The spike's honest-empty-state case, Feuersalamander, has 1,000 edges. GloBI's problem is noise, not absence. **Rejected — filling gaps from EOL or text:** there are almost no gaps.

**E10 — regional siblings.** Global same-genus lists are useless (Turdus has 50 backbone siblings) and regional ones are free once the set exists. **Rejected — curated pairs:** later, per region, as the spike said.

**E11 — monthly and once.** Thirteen GBIF calls per region per month is small enough to run for every active region; content is fetched once because Wikipedia intros and Commons images do not change on a schedule worth polling. The probe is the proof: 7,000 responses, zero 429s except EOL. **Rejected — request-time fetching** for a region nobody has picked: two minutes of "wird vorbereitet" in a queue is honest, a spinner on the grid is not.

**E12 — the thin part is language.** Kyoto's images, interactions and cut behave like Mainz-Bingen's; German text halves. So the UI line is computed, per region, about text language, not a fixed "coverage is thin here". **Rejected — a fixed warning outside Europe:** false for images and ecology, true only for German prose.

**E13 — one sentence.** One sighting is not plausibility, so the region's set does not move; refusing the log would break Q2's promise of the full backbone; the user's own dex grows past the denominator, which is the honest reading of finding what the data did not predict. **Rejected — per-user backfill:** there is nothing to backfill from when the region has no records.

## 📌 Risks and open mechanics

- **931 is a screen test, not a proof.** The owner said yes to the number and the ranked lists; nobody has scrolled 931 tiles yet. If the grid feels like a checklist, the lever is the tile share (80 %), not the month.
- **The cut follows the recorders.** naturgucker and eBird dominate Germany, eBird and iNat dominate Kyoto; national schemes outside GBIF (Japan's, most of Asia's) are invisible. The set is what open data sees, and the spec should say so.
- **Effort normalisation has a floor.** Species with under 50 records get noisy month shares; the words can flicker between refreshes. Consider freezing words for species under 50 records to the year's shape.
- **iNat licences move.** A default photo can change licence or be replaced; the ETL stores what it saw, with attribution, and only re-fetches on purge. A takedown path is needed before a second user.
- **GloBI's cap.** 1,000 edges per direction for common birds means the ETL must page or rank before storing; storing the first 1,000 unordered is arbitrary.
- **The fish tile is a Kyoto fact.** No other region has been checked; if a coastal region floods the tile with 200 reef fish, the tile needs its own cut, not the shared one.
- **The agent's pattern this time.** It proposed two threshold rules it later withdrew (flat per-group, 0.5 % of effort) before the owner reframed the question. Future grills on the set should start from the user's mental model of the list, then find the arithmetic, not the reverse.

## 📚 Related

- [`docs/handoffs/0005-etl-grill.md`](../handoffs/0005-etl-grill.md) — the questions
- [`docs/handoffs/0005-etl-grill-findings.md`](../handoffs/0005-etl-grill-findings.md) — the tables
- [`scripts/etl-probe/`](../../scripts/etl-probe/README.md) — the probe, stays until M4 replaces it
- [`docs/records/0001-standkreis-dex-the-first-walk.md`](0001-standkreis-dex-the-first-walk.md) — Q2 partly superseded, Q7 refined

## 📎 Addenda

*(none)*
