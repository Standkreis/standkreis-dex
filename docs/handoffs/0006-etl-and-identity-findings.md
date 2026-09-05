# 🔎 [0006] Findings — the ETL (M4) and identity (M7)

> Companion to [handoff 0006](0006-etl-and-identity.md). What was decided that the spec did not say, one table per track, plus the C2 and C6 numbers.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-05 | Sven Reiser | C2 C3 pass; C4–C7 not run yet (content job not built, on the owner's instruction to see the tile counts first) |

## 🗄️ Track A · the ETL

| Decision | Chosen | Why, and what was rejected |
| --- | --- | --- |
| Year facet or summed months (findings 0005 §📌) | **The year facet decides membership and `obs`; the twelve month facets give only the shares.** 13 calls, all used | The year facet counts every record in the window, including the ones without a month; the sum of months does not. `obs` on the page should be "records in ten years", not "records with a month". The 929 vs 931 gap in the fixture was not this: it is the widened 🦋 tile cut as one tile (429) instead of Insecta (396) plus a rest tile (35) |
| Share unit | **Per 100,000** in `Plausibility.monthShare` and `peak` = per mille with two decimals, the fixture's `sharePerMille` × 100. Routers return per mille (`÷ 100`) | Per mille rounds every species under ~50 records to zero: "nur jetzt" in September fell from 364 to 194 and "Ganzes Jahr" from 46 to 40. Per 10,000 gives 399 (rounding up small shares), per 100,000 gives the fixture's 364 and 45. The schema comment "per mille" on `monthShare` and `peak` is now wrong and needs the owner's edit (no schema change, a comment) |
| Cut | matrix.mjs verbatim: species ≥ 10 sorted by `obs`, kept until the kept ones reach 90 % of the ≥ 10 species' effort | Species under the floor count for nothing, not even the effort, as in the probe |
| Tiles | `class` Aves · Mammalia · Amphibia · Squamata + Testudines + Crocodylia → `phylum` Chordata = 🐟 → `kingdom` Animalia = 🦋, Plantae, Fungi → else no tile | One of 1,603 species ≥ 10 has no tile in Mainz-Bingen (not Animalia, Plantae, Fungi) |
| Words separator | `Feb · Okt–Dez` with a middle dot, as the schema comment says (the probe used a comma) | One string to render, no splitting |
| No observations in any month | `words = ""`, `peak = 0`, `nowRatio = 0` | Cannot happen for a set member with the year facet unless every record lacks a month; the router must not divide by zero |
| Write | One interactive transaction at the end: upsert `Taxon` (only `sciName rank tile class order genus`, never content), delete + createMany `Plausibility` and `Lookalike` for the region, region → `ready` | A failed facet throws before the transaction; the region is `failed` with the message and keeps its previous rows |
| `Taxon.rank` | GBIF's rank, lower-cased (`species`) | The facet is species only; the column is a string |
| Region lookup | `region <name>` picks the first GADM level-2 hit; `region <gid>` (e.g. `DEU.11.19_1`) looks the gid up directly, which is what `refresh` uses | A name like "Kyoto" is ambiguous at level 1 vs 2; the gid is not |
| Region `higher` | GBIF's `higherRegions` names joined with ` › `: "Germany › Rheinland-Pfalz" | GBIF returns English country names; localising them is a UI concern |
| Fetch budget | 5,000 per host per run (`ETL_BUDGET`), gaps and retries as the probe | The probe's 1,000 is below one region's 1,617 GBIF calls |
| Species records | 6 in flight to GBIF `species/{key}`, as the probe | 1,603 calls in ≈ 25 s, zero 429s |
| Read API shapes | `dex.set({regionId, tiles, nowOnly?, month?})` → `{ region, month, setSize, tiles: [{tile, count}] (🐟 dropped when 0), species: [{taxonId, gbifKey, sciName, names, tile, obs, monthShare‰, peak‰, nowRatio, now, words, lead, hasContent}] }` sorted `nowRatio` desc then `obs`; `dex.regions()`; `taxon.page({gbifKey, regionId?, month?})` → names, intro, facts, assets with attribution, `plausibility` (null outside the set), `lookalikes`, `interactions` by kind with `inSet` per target; `taxon.ensure({gbifKey})` creates the row from GBIF, `contentAt` null | Pure reads. `lead` is the first image `Asset`, null until the content job runs |
| Rules shared with the app | `app/etl/rules.ts` (tiles, cut, shares, words, nowRatio) is imported by the routers with a relative path; `taxon.ensure` imports `etl/gbif.ts` for one cached call | The export build has no route handler, so nothing of `etl/` lands in `out/`; the server build compiles it into the tRPC route |
| Tests | `src/server/routers/dex.test.ts`: tiles, cut, words (Turmfalke, Hausrotschwanz, wrap, two runs), now | The vitest include is `src/**`, so the rules test lives next to the router it serves |
| Not done in this run | Content job (`etl content` is a stub that throws), C4–C7, the probe deletion and fixture move, Kyoto | Owner's stop after C2 |

### C2 · Mainz-Bingen, empty cache

| | 🐦 | 🦋 | 🌿 | 🍄 | 🦌 | 🐸 | 🦎 | 🐟 | set | lookalike pairs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| expected (findings 0005) | 69 | 431 | 388 | 23 | 8 | 7 | 5 | 0 | 929–931 | 358 species with ≥ 1 |
| **got** | 69 | **429** | 388 | 23 | 8 | 7 | 5 | 0 | **929** | 864 directed pairs |

Region `ready` · 237,740 observations, 5,250 species in the year, 1,603 at ≥ 10 · **31 s** wall time from an empty cache · **1,617 GBIF requests** (1 GADM, 13 facets, 1,603 species), 0 retries, **0 × 429** · second run 0.6 s, 0 requests.

### C3 · `dex.set`, September

| Check | Result |
| --- | --- |
| all tiles, `nowOnly: false` | 929 |
| all tiles, `nowOnly: true` | **364** (expected 364 ± 5) |
| Turmfalke *Falco tinnunculus* | in the year ✅ · in September ✅ · **Ganzes Jahr** · nowRatio 1.00 |
| Hausrotschwanz *Phoenicurus ochruros* | in the year ✅ · in September ✅ · **Mär–Okt** · nowRatio 1.00 |
| Mauersegler *Apus apus* | in the year ✅ · **not** in September ✅ · Mai–Jul · nowRatio 0.02 |
| 🐟 hidden | `tiles` has seven entries, no fish |
| `taxon.page` Amsel | lookalikes Turdus philomelos, Turdus pilaris |
| `taxon.ensure` Fuchs 5219243 | creates a mammal row with `contentAt` null (E13) |

## 🔐 Track B · identity and data

*(Track B adds its table here.)*
