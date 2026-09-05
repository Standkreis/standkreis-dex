# 🔥 [0005] Handoff — the ETL grill (M3)

> ✅ **Done 2026-09-05.** Output: [record 0002](../records/0002-etl-the-plausible-set.md) · [findings 0005](0005-etl-grill-findings.md) · spec §🧬 §🗄️ §🗃️.
>
> A handoff for a grill, not a build. Child of [record 0001](../records/0001-standkreis-dex-the-first-walk.md) §📌 "the threshold is the product", sibling of [0004](0004-scaffold.md). Its output is a record and a spec section, not code.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-04 | Sven Reiser | [Record 0001](../records/0001-standkreis-dex-the-first-walk.md) · [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🧬 §🗄️ | 1 grill session + 1 data session, throwaway scripts |

---

## 🎯 Why

Everything visible depends on the plausible set, and nobody has looked at real numbers yet. The spike's 45 species were authored by hand. The record says the threshold is the product; the spec says the tuning is a first-slice task; six doubts from the spike are parked here. Before M4 writes an ETL, the questions that decide its shape have to be answered against real GBIF and iNaturalist counts for Mainz-Bingen, and one region elsewhere, with the owner's eyes on the list.

**Grill, not pipeline.** The session ends with decisions and a record. If a script is needed to see the numbers, it is throwaway and lives in `scripts/etl-probe/`.

## ⬆️ Input

| Read | Why |
| --- | --- |
| [Record 0001](../records/0001-standkreis-dex-the-first-walk.md) Q2 Q7 §📌 | What the plausible set is, what composes a species page, the named risks: threshold, coverage, rate limits, attribution debt |
| [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🧬 "The plausible set" §🗄️ | Landkreis as label over cells, month first-class, the source table with licences |
| [Findings 0002](0002-ui-exploration-findings.md) doubts 3, 8, 13, 16, 20, 21, 22, 43 | The ETL notes the spike parked: image quality, Wikidata rank, Landkreis vs cell, backbone species joining the grid, AnAge coverage, look-alikes, sound licences, the crop |
| `spike/ui/scripts/build-fixture.mjs` | The only code that has talked to Wikidata, Commons and Wikipedia so far; 30 s for 45 species. Read for the query shapes, then discard |
| [Research 01](../research/01-market-research.md) §feasibility | Rate limits and API notes gathered in step 1 |

## ❓ The questions

Grill format: one question at a time, the agent proposes with evidence from the probe, the owner decides. 🙋 marks an override.

| # | Question | What the answer needs |
| --- | --- | --- |
| E1 | **Cell size.** 10 km as the species map shows, or GBIF's own grid, or Landkreis polygons directly | Count species for Mainz-Bingen at 5, 10, 25 km cells; how many cells a Landkreis is; how the union behaves at the border |
| E2 | **Threshold.** How many observations, over what window, per cell and month, make a species "plausible" | The list at three thresholds for September; the owner reads each and says which is "what I could find on Saturday". Expect 40 to 400 |
| E3 | **Month.** Occurrence per calendar month from GBIF facets, or a phenology curve; what "Ganzes Jahr" means numerically | A twelve-column table for ten known species (Amsel, Eichelhäher, C-Falter, Fliegenpilz …) and whether it matches what the owner knows |
| E4 | **Sources for the set.** GBIF alone, iNaturalist alone, or both; how to weight research-grade vs casual | Overlap and disagreement between the two for the same cell and month |
| E5 | **Groups.** Which taxonomic ranks map to the seven onboarding tiles; what happens to the rest (spiders, molluscs, mosses) | A mapping table; a count of species that fit no tile |
| E6 | **Rank and matching.** Species only, or subspecies folded up; how Wikidata QIDs are found from GBIF keys; what to do when the match is a section, not a species (doubt 8) | Match rate on the September list |
| E7 | **Images.** Which image per species, from where, with what crop; how to detect a herbarium sheet or a distant shot (doubts 3, 43) | For the September list: how many have a Commons lead image, how many look usable as a square tile, what iNaturalist adds |
| E8 | **Text and facts coverage.** Wikipedia intro, AnAge, EOL, IUCN habitat: what share of the list has each (doubt 20) | A coverage table per source for de and en |
| E9 | **Interactions.** GloBI edge counts per species on the list; how many have zero; which kinds dominate | The Feuersalamander case at scale: what share of the grid has an honest empty state |
| E10 | **Look-alikes.** Same genus from GBIF as the slice-one rule (doubt 21): how many species get at least one | Count and three spot checks |
| E11 | **Refresh and rate limits.** How often the set is recomputed, cached per cell and month, within iNat's 60/min and 10k/day | A request budget for one region and for ten |
| E12 | **Global honesty.** Run E2 and E8 for one region outside Europe (owner picks) | The numbers that go into the "coverage is thin here" UI line |
| E13 | **Backbone species outside the set** (doubt 16). Where a logged species with no occurrence data sits, and whether the ETL backfills it | A rule, one sentence |

## 🛠️ The probe

Throwaway scripts in `scripts/etl-probe/`, Node, no framework, JSON out. Each script answers one question above and prints a table the grill can paste.

| Script | Talks to | Answers |
| --- | --- | --- |
| `cells.mjs` | GBIF occurrence facets | E1, E2, E3, E4 |
| `groups.mjs` | GBIF backbone | E5, E6 |
| `assets.mjs` | Wikidata, Commons, iNaturalist | E7 |
| `coverage.mjs` | Wikipedia, AnAge, EOL, GloBI | E8, E9, E10 |
| `budget.mjs` | counts only | E11 |

Rules: cache every response on disk under `scripts/etl-probe/.cache/` (git-ignored) so the grill can be re-run without hitting the APIs twice; a `User-Agent` naming the project; no key that is not free; stop at 1,000 requests per source per run.

## ⬇️ Output

| Deliverable | Lands |
| --- | --- |
| Record | `docs/records/0002-etl-the-plausible-set.md`, immutable, same shape as record 0001: facts, decisions E1 to E13, reasoning with rejected alternatives, risks |
| Spec | Spec 0001 §🧬 "The plausible set" and §🗄️ rewritten with the numbers: cell, threshold, sources, refresh. One new section §🗃️ ETL: tables written, order of jobs, cache policy |
| Findings | The probe's tables as `0005-etl-grill-findings.md`, with the September list at the chosen threshold as the first real fixture |
| Doubts | Findings 0002 doubts 3, 8, 13, 16, 20, 21, 22, 43 each get an answer line |
| Probe | `scripts/etl-probe/` stays until M4 has replaced it |

**Definition of done:** the owner has read the September list for Mainz-Bingen at the chosen threshold and said "that is my Saturday", one non-European region has its coverage numbers on file, and M4 can be written from the spec without asking a question.

## 🚫 Not in this grill

Writing the ETL (M4) · the Prisma schema beyond confirming it can hold the answers (M2) · quests or the recap (M10) · sounds beyond their licence line · the LLM editor (M16) · anything that needs a paid key.

## 👉 Start the session with

```
Read docs/handoffs/0005-etl-grill.md and the two documents it names first in §⬆️.
Write the probe scripts in scripts/etl-probe/ as §🛠️ describes and run cells.mjs for Mainz-Bingen in September.
Show me the species list at three thresholds before asking a single grill question.
```
