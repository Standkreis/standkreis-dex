# 🔎 [0006] Findings — the ETL (M4) and identity (M7)

> Companion to [handoff 0006](0006-etl-and-identity.md). What was decided that the spec did not say, one table per track, plus the C2 and C6 numbers.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-05 | Sven Reiser | C2–C7 pass (Track A); C8–C12 are Track B's |

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
| Content job shape | `etl content [--region <name>] [--purge <gbifKey>] [--limit n]`: taxa with `contentAt` null **and** a plausibility row (in the region if given) or a sighting. Batches first (Wikidata by P846, then P225 for the misses; Commons `imageinfo` for every P18, 40 per call), then four taxa at a time: iNat → ladder → Wikipedia → AnAge → GloBI → one transaction per taxon. Writes are serialised through one chain | Four parallel transactions on `Taxon` deadlocked in Postgres (5 wasps and bumblebees in the first leg); fetches stay parallel, writes go one at a time |
| GloBI targets outside every set | Resolved by **GBIF `species/match?strict=true`**, exact matches only; the target gets a `Taxon` row with tile from its ranks (any rank: "Poaceae" is a plant), `contentAt` null, never picked up by the content job (the selection filters on plausibility or sighting). Names resolved once per run and cached on disk | GloBI's `target_taxon_external_id` is GBIF for 5 % only (COL, EOL, WD, ITIS for the rest); `gbifKey` is the row's identity. Cost: **≈ 17,000 GBIF match calls** for Mainz-Bingen, 18,301 target rows. The spec's "≈ 5,700 calls per region" did not count this |
| GloBI paging and cap | `limit=1000&offset=…` until a short page (Amsel: 4,980 edges, 5 pages); kinds folded (`preysOn` → `eats`, `preyedUponBy` → `eatenBy`, everything else dropped); unique `(kind, target)`; targets in **any** region's set first (by name), then the rest; **200** total. Then the kept targets are resolved | In-set first means Amsel's 200 are all `eats` on set members: the plants and worms the page can link to. The grass moths never touch the cap (largest: Udea ferrugalis 153 raw → 113 stored) |
| GloBI target names | Only Latin-shaped names are resolved (`^[A-Z][a-z]+( [a-z-]+){0,2}$`); "detritus", "no name" and the source itself are dropped | Stored edges are 5–20 % below GloBI's folded unique pairs because GBIF has no exact match for synonyms and dirty names |
| Fetch layer | Per-host gap as a **reserved slot** (parallel callers queue instead of firing together); GBIF gap 0 but **6 in flight**; budget 50,000 per host (`ETL_BUDGET`) | The ported gap raced under `pool`; serialising GBIF at 10/s would have made the region job 3 × slower. 20,000 was too low for the match calls |
| Wikidata query | One SPARQL per 120 keys with `SAMPLE` per field plus P105 (rank), P4024 (AnAge), the Japanese label; the P225 batch for the misses. **Rank must be species (Q7432)**, else `namePath = none` and nothing is taken | E6 verbatim. Mainz-Bingen: 871 P846 · 53 name · 5 none. Two keys on one item → the second stores content without `wikidataId` (unique) |
| Names | `de` = dewiki title without the "(…)" suffix, unless it is the Latin name again (equal, or starting with the genus); `en` = enwiki title on the same rule, else a non-Latin English label; `ja` from the label | Shape cannot tell "Common blackbird" from a binomial (the first cut treated "Amsel" as Latin and was thrown away). English vernaculars exist for 251 of 929: enwiki titles insects and plants by their Latin name |
| iNat licences | `cc0 cc-by cc-by-sa cc-by-nc cc-by-nc-sa cc-by-nd cc-by-nc-nd` count as licensed; URL from the code (4.0) | E7 says CC0/BY/BY-NC; the probe's 84 % counted every CC code, and ND is fine for an image shown whole |
| Commons attribution | `Artist` stripped of HTML, `LicenseShortName`, `LicenseUrl`; public-domain and "Attribution" files have no URL on Commons → the PD mark, else the file page | C5 wants a `licenceUrl` on every lead; 5 of 116 Commons leads had none |
| Ladder reject list | The probe's regex, word-anchored where it flinched (`\begg`, `\bmap\b`, `\bnest\b`), plus the plate publishers the eye found: `mounted illustration köhler sturm erbario herbar ypey dioscoride botanical cut` | 25 % flagged loosely in the probe; the plate makers are the confirmed ones |
| Intro | REST `page/summary` extract ≥ 80 chars, de then en, stored as `{ text, lang, source, licence: "CC BY-SA 4.0" }` | E8, E12; `dex.regions` counts `introEn` per region |
| Facts | AnAge entry page (P4024 → `entry.php?species=…`) scraped for `Maximum longevity` and clutch or litter size, litters per year, female maturity; English strings with `source: AnAge` and the URL. size, migration, sound stay empty | AnAge has no API; 64 of 929 have a row |
| `dex.regions` | Adds `setSize`, `content`, `introEn`, `introEnShare`, `noGermanName` per region | The E12 honesty line is a computed number |
| Seed | Both fixtures as plausibility only (region, taxon, plausibility, lookalike), every write an upsert; `higher` added to the fixture files; content stays a manual command | Handoff §❓ "Kyoto in seed?" — the proposal, taken. 2.4 s on a filled database. The fixtures are the grill's summed-months cut, the job is the year-facet cut: Kyoto differs by one species (fixture Pelophylax porosus, job Zhangixalus schlegelii; both now in the table), Mainz-Bingen by none; lookalike pairs 862 vs 864 (genus from the name vs GBIF's genus) |
| Probe | `scripts/etl-probe/` deleted; its README's run table lives on in git history at `cef832f`; the links in findings 0005, record 0002 and spec §🗃️ point there | Those documents are frozen for this track |

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

### C4 · content, Mainz-Bingen

| | leg a (killed at 400 to raise the budget) | leg b | second run |
| --- | --- | --- | --- |
| taxa | 412 filled (5 deadlocked, retried in b) | 517 filled, 0 failed | 0 to fill |
| wall | 444 s | 613 s | **0.3 s** |
| network | iNat 353 · GBIF 8,921 · GloBI 480 · dewiki 309 · enwiki 13 · AnAge 86 · Wikidata 8 · Commons 23 (last logged line, at 400) | iNat 541 · GBIF 7,752 · GloBI 751 · dewiki 476 · enwiki 24 · AnAge 59 · Wikidata 6 · Commons 13 = **9,622 misses**, 7,018 cache hits | **0 misses, 0 requests** |
| 429s | 0 | 0 (1 retry on a 5xx) | 0 |

Whole region **≈ 18 min** (plus a 5-taxon smoke run of 64 s), ≈ 17,300 GBIF calls of which ≈ 15,700 are `species/match` for GloBI targets. Result: lead image **iNat 810 · Commons 116 · none 3** · intro **de 852 · en 38 · none 39** · German name 844 (85 without) · English vernacular 251 · Japanese label 405 · IUCN 208 · AnAge facts 64 · `wikidataId` 924 · 124,863 edges (eatenBy 58,733 · eats 42,571 · visitsFlowersOf 10,209 · hostOf 7,343 · pollinates 5,778 · parasiteOf 229) · 18,301 out-of-set `Taxon` rows, none with content.

### C5 · the ladder on the specimen leads

43 species whose P18 the probe flagged as mounted, plate, herbarium, Köhler, Sturm, Erbario or caterpillar (the 19 confirmed among them): **none has a rejected file as lead**; 40 took iNat, 3 a different Commons file (Orthosia cerasi, Sambucus ebulus, Aegopodium podagraria — P18 changed since the grill). No lead anywhere matches the reject list. **926 reference assets, all with author, licence, licenceUrl, sourceUrl** (5 public-domain files got the PD mark as URL).

### C6 · Kyoto

Region: **303 taxa** (🐦 39 🦌 4 🐸 8 🦎 8 **🐟 19** 🦋 121 🌿 96 🍄 8), 99,043 observations, 108 lookalike pairs, "nur jetzt" September 165 · **5.2 s**, 427 GBIF requests (the rest cached from the grill's shared species), 0 × 429.

Content: 267 taxa to fill (36 shared with Mainz-Bingen already had content), 0 failed, **5.2 min**, 5,804 network calls (iNat 277 · GBIF 4,979 · GloBI 283 · enwiki 110 · dewiki 110 · AnAge 34 · Commons 7 · Wikidata 4), 0 × 429. Over the set of 303: intro **de 139 · en 109 · none 55** (≥ 90 English-only ✅), German name missing for **167** (the grill's 159 counted dewiki titles that are the Latin name again; the stricter rule drops those), English vernacular 75, Japanese label 259, IUCN 113, AnAge 29, lead iNat 264 · Commons 37 · none 2, 11,518 edges. `dex.regions` reports `introEnShare` 0.36 for Kyoto against 0.04 for Mainz-Bingen.

### C7 · GloBI

| species | GloBI raw | folded unique | stored | in-set targets |
| --- | --- | --- | --- | --- |
| Amsel *Turdus merula* | 4,980 (5 pages) | 4,876 | **200** | **200**, all `eats`: Prunus avium, Lonicera xylosteum, Crataegus monogyna … |
| Chrysoteuchia culmella (grass moth, Crambidae) | 86 | 72 | 66 | 4 |
| Udea ferrugalis (largest Crambidae) | 153 | 117 | 113 | |

No Crambidae in the set has the probe's "14" as source alone (the probe summed both directions). The `Interaction` table holds the six kinds only: **no `interactsWith`, no `adjacentTo`** (they are dropped at fold time and cannot be stored, the enum has six values).

## 🔐 Track B · identity and data

*(Track B adds its table here.)*
