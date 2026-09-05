# 🔬 [0005] Findings — what the probe measured

> Companion to [handoff 0005](0005-etl-grill.md). Decisions live in [record 0002](../records/0002-etl-the-plausible-set.md); this file keeps the numbers. Scripts: [`scripts/etl-probe/`](../../scripts/etl-probe/README.md), raw tables in its `out/`.

| 🗓️ Date | 👤 Owner | 🗺️ Regions | 📡 Requests |
| --- | --- | --- | --- |
| 2026-09-05 | Sven Reiser, with Claude Fable 5.1 | Mainz-Bingen `DEU.11.19_1` (604 km²) · Kyoto `JPN.22.13_1` (5,186 km²) | ≈ 7,000 cached, 0 rate-limit errors except EOL |

---

## E2 · 🔢 The list at three thresholds (September, as the handoff asked)

Mainz-Bingen, month 9, 2016–2026, observation records only: **15,553 observations, 1,344 species.**

| ≥ obs | species | of which 🐦 | 🦋 | 🌿 | 🦌 | ❔ |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | 393 | 116 | 155 | 88 | 9 | 17 |
| 10 | 217 | 94 | 78 | 28 | 6 | 10 |
| 20 | 136 | 75 | 40 | 10 | 6 | 5 |

| Dataset behind the September list | share | licence |
| --- | --- | --- |
| NABU naturgucker | 41 % | CC BY |
| eBird | 33 % | CC BY |
| iNaturalist research grade | 11 % | CC BY-NC |
| Observation.org | 9 % | CC BY-NC |
| ArtenFinder, Pl@ntNet, Birda | 6 % | CC0 / CC BY |

What the flat cut shows: birds are 55 % of the ≥20 list, Nosferatu-Spinne ranks 4th above Amsel, Brennnessel has 9 records and Rotbuche 5. A flat count measures who records, not what is findable. The owner's reframing: month is a filter or a sort, membership is the year.

### The whole year, cut per tile

Mainz-Bingen, 2016–2026: **237,740 observations, 5,250 species.** Cut = species making up 90 % of each tile's observations, floor 10.

| tile | species | share of set |
| --- | --- | --- |
| 🦋 Insekten & Spinnen | 396 (+35 spiders, snails, woodlice before widening) | 43 % |
| 🌿 Pflanzen | 388 | 42 % |
| 🐦 Vögel | 69 | 7 % |
| 🍄 Pilze | 23 | 2 % |
| 🦌 Säugetiere | 8 | 1 % |
| 🐸 Amphibien | 7 | 1 % |
| 🦎 Reptilien | 5 | 1 % |
| **Set** | **931** | |

Alternatives measured: 80 % → 622, 95 % → 1,171; the agent's withdrawn "0.5 % of tile effort" rule → 265 for Kyoto and collapsed insects at year scale.

## E1 · 🗺️ Cells against the polygon

| cell | cells | centre inside | union species | spill beyond the Landkreis | call time |
| --- | --- | --- | --- | --- | --- |
| 25 km | 8 | 1 | 3,696 | +175 % | 20–35 s |
| 10 km | 19 | 5 | 2,388 | **+78 %** | 20–35 s |
| 5 km | 49 | 26 | 2,072 | +54 % | 20–35 s |
| GADM polygon | 1 | | 1,344 | 0 | **5–8 s** |

The spill is Mainz, Wiesbaden and the Rheingau. No grid.

## E3 · 📅 Month profiles, effort-normalised

Bars = the species' share of all regional observations in that month. Region totals per month below.

| Art | Σ | Jan–Dez | reading |
| --- | --- | --- | --- |
| Amsel | 6,009 | █▇▅▄▄▄▃▂▄▄▇█ | Ganzes Jahr ✅ |
| Eichelhäher | 2,351 | █▄▄▃▃▂▂▃▅▆▇▇ | Ganzes Jahr ✅ |
| C-Falter | 230 | ▁▁█▄▂▅▆▃▂▂▁▁ | Mär–Jul; September at 0.10 of peak ❌ the one miss |
| Fliegenpilz | 19 | ▁▁▂▁▁▁▁▁▂█▃▁ | Okt–Nov ✅ |
| Admiral | 594 | ▁▃▄▃▂▅██▆▆▂▁ | Jun–Okt ✅ |
| Mauersegler | 843 | ▁▁▁▂██▇▂▁▁▁▁ | Mai–Jul ✅ |
| Kranich | 977 | ▂█▁▁▁▁▁▁▁▆▇▃ | Feb · Okt–Dez ✅ |
| Schneeglöckchen | 53 | ▂█▆▁▁▁▁▁▁▁▁▁ | Feb–Mär ✅ |
| Hirschkäfer | 63 | ▁▁▁▁▂█▅▁▁▁▁▁ | Jun–Jul ✅ |
| Braunbrustigel | 347 | ▁▁▂▃▄▃▄▄█▃▃▂ | Apr–Okt ✅ |

| Region obs | Jan | Feb | Mär | Apr | Mai | Jun | Jul | Aug | Sep | Okt | Nov | Dez |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mainz-Bingen | 15,706 | 11,261 | 20,094 | 24,036 | 40,416 | 32,286 | 23,182 | 20,077 | 15,553 | 16,101 | 9,557 | 9,471 |

May has four times December's effort; raw counts would call every species a May species.

## E4 · 🔢 GBIF against iNaturalist

Same place, September, all years.

| source | species | ≥5 | ≥10 | ≥20 |
| --- | --- | --- | --- | --- |
| GBIF, all datasets | 1,573 | 464 | 251 | 152 |
| iNat research grade | 926 | 135 | 42 | 8 |
| iNat verifiable (+ needs ID) | 1,167 | 159 | 49 | 8 |

GBIF ≥10 but absent from iNat research grade: **40**, among them Grünspecht, Saatkrähe, Feldhase, Feldhamster, Goldammer. iNat ≥10 but absent from GBIF: 2 shield bugs. iNat research grade is already 11 % of GBIF here.

## E5 · 🧩 Tiles

35 of 931 fit none of the seven spec tiles:

| class | n | examples |
| --- | --- | --- |
| Arachnida | 22 | Nosferatu-Spinne, Gartenkreuzspinne, Wespenspinne, Listspinne |
| Gastropoda | 11 | Weinbergschnecke, Hain-Bänderschnecke, Tigerschnegel |
| Malacostraca, Chilopoda | 2 | a woodlouse, the house centipede |

→ Insekten widened to **Insekten & Spinnen** = Animalia minus Chordata.

## E6 · 🔗 Rank and matching

| check | result |
| --- | --- |
| taxonKey facet ≥10 | 3,545 taxa: 1,603 species keys, 1,942 genus-or-higher (no species key, drop out) |
| speciesKey facet | folds subspecies, varieties and forms already |
| Wikidata by P846 | 874 / 931 (94 %) |
| Wikidata by exact name, for the rest | 55 / 57 (misses: Brennnessel's split, Margerite, Zunderschwamm resolved later by name) |
| Item is not a species | 1 (Draba verna → genus) |
| Two items on one key | 2 |
| German name via dewiki title | 830 (89 %); Wikidata's German label is the Latin name |

## E7 · 🖼️ Images

| measure | Mainz-Bingen (931) | Kyoto (303) |
| --- | --- | --- |
| Commons P18 present | 92 % | 90 % |
| landscape · portrait · square | 52 · 27 · 14 % | 58 · 18 · 14 % |
| under 600 px | 9 % | 11 % |
| confirmed specimen or plate by filename | 19 (Kohlweißling mounted, MHNT plates, 1885 Waldrebe) | |
| iNat default photo, sample | 120: **100 %** present | 108: 100 % |
| iNat CC0 / BY · BY-NC · all rights | 22 · 62 · 17 % | 25 · 60 · 15 % |
| no image at all | 0 | 0 |

Commons licences on the leads: CC BY-SA 3.0 315, CC BY-SA 4.0 189, public domain 78, CC BY 2.0 51, CC0 28, GFDL 3, GPL 1. Contact sheet of 72 random leads: `scripts/etl-probe/out/e7-contact-sheet.html`.

## E8 · 📖 Text and facts

| source | Mainz-Bingen | Kyoto |
| --- | --- | --- |
| de.wikipedia intro | 87 % | 44 % |
| en.wikipedia intro | 86 % | 78 % |
| IUCN status (P141) | 22 % | 36 % |
| AnAge (P4024) | 16 % | 16 % |
| Wikidata habitat · mass · lifespan | 1 · 5 · 1 % | |
| EOL public pages API | no traits returned, 429 at 3 in flight | |
| EOL TraitBank, IUCN API | token required | |

## E9 · 🕸️ GloBI

Sample 258 species across all tiles (Kyoto 221).

| | Mainz-Bingen | Kyoto |
| --- | --- | --- |
| ≥1 edge | 100 % | 96 % |
| zero edges | 0 | 9: Euhadra snails, a turtle, a tiger beetle, two damselflies |
| at the 1,000 cap | Ringeltaube, Kohlmeise, Star, Amsel, Elster … | Graureiher, Feldsperling, Schwarzmilan … |

Edge kinds, Mainz-Bingen: eats 44,213 · eatenBy 39,123 · preysOn 19,395 · hostOf 8,511 · **interactsWith 8,070** · visitsFlowersOf 8,008 · **adjacentTo 3,500** · pollinates 3,395 · parasiteOf 1,357. The two generic kinds are dropped.

## E10 · 👯 Look-alikes

Global same-genus siblings from the backbone: every species has ≥1, Turdus alone 50. Within the region's set:

| tile | with a regional sibling |
| --- | --- |
| 🐦 | 19 / 69 |
| 🦋 | 134 / 396 |
| 🌿 | 198 / 388 |
| 🦌 🐸 🦎 | 0 |
| **all** | **358 / 931** |

## E11 · ⏱️ Budget

| job | calls | bound |
| --- | --- | --- |
| plausibility, one region | 13 GBIF | seconds |
| content, one region first fill | ≈ 5,700 (Wikidata 10, Wikipedia 1,860, iNat 931, Commons 140, GloBI 931, GBIF 931) | iNat 1/s → ≈ 20 min |
| ten regions | ≈ 31,000 | iNat at 51 % of its daily 10,000 once |

The probe itself: ≈ 7,000 responses, zero 429s from GBIF, Wikidata, Wikipedia, Commons, iNat, GloBI.

## E12 · 🌏 Kyoto

Kyoto city, 2016–2026: **99,043 observations, 2,112 species → set 303.** eBird 58 %, iNat 34 %.

| tile | species | first entries |
| --- | --- | --- |
| 🦋 | 106 | Argynnis hyperbius, Papilio xuthus, Graptopsaltria nigrofuscata |
| 🌿 | 96 | Nandina domestica, Acer palmatum, Phyllostachys edulis |
| 🐦 | 39 | Ardea cinerea, Hypsipetes amaurotis, Corvus macrorhynchos |
| 🐟 | 19 | Cyprinus carpio, Oryzias latipes, Silurus asotus, 9 Cypriniformes, 5 Perciformes |
| 🐸 🦎 🍄 | 8 · 8 · 8 | Lithobates catesbeianus, Plestiodon japonicus, Trametes coccinea |
| 🦌 | 4 | Macaca fuscata, Cervus nippon, Myocastor coypus, Sus scrofa |
| ❔ spiders, snails, crabs | 15 | Trichonephila clavata, Euhadra amaliae, Geothelphusa dehaani |

| what | Mainz-Bingen | Kyoto | verdict |
| --- | --- | --- | --- |
| names de · en · ja | 89 · 93 · — % | 48 · 94 · 81 % | the thin part |
| intro de · en | 87 · 86 % | 44 · 78 % | fallback de → en |
| images Commons · iNat licensed | 92 · 84 % | 90 · 85 % | equal |
| GloBI ≥1 edge | 100 % | 96 % | equal |
| IUCN · AnAge | 22 · 16 % | 36 · 16 % | equal |

The fish tile came from here: GBIF's backbone gives ray-finned fishes orders but no class, so they fell through every tile.

## E13 · 🦊 Outside the set

Fuchs and Wildschwein: no GBIF observation record in Mainz-Bingen in ten years. The set is what open recorders saw. Decision in record 0002 E13.

---

## 🧬 The first real fixture

`scripts/etl-probe/out/fixture-mainz-bingen.json`, built by `matrix.mjs` from twelve month facets: 929 species with `byMonth`, `sharePerMille`, `nowRatio`, `now`, `words`, German and English name, Wikidata QID, Commons image, IUCN. (Two species of the 931 fell under the floor when the twelve monthly facets were summed instead of one year facet.) Kyoto: `fixture-kyoto.json`, 303 species.

| | Mainz-Bingen | Kyoto |
| --- | --- | --- |
| species | 929 | 303 |
| "nur jetzt" in September (≥ 25 % of peak) | **364** | 164 |
| "Ganzes Jahr" | 46 | 41 |
| without German name | 101 | 159 (99 of them have English) |

### September, "nur jetzt" — 364 of 929, per tile

- 🐦 Vögel **49** · Turmfalke · Hausrotschwanz · Zilpzalp · Felsentaube · Bachstelze · Halsbandsittich · Schwarzkehlchen · Grünspecht · Mehlschwalbe · Dohle · Ringeltaube · Mäusebussard · Rotmilan · Türkentaube · Lachmöwe · Rabenkrähe · Graureiher · Eichelhäher · Gartenbaumläufer · Elster · Star · Buntspecht · Kohlmeise · Stockente · Rauchschwalbe · Bluthänfling …
- 🦌 Säugetiere **5** · Gartenschläfer · Braunbrustigel · Feldhamster · Feldhase · Eichhörnchen
- 🦋 Insekten & Spinnen **173** · Nosferatu-Spinne · Europäische Gottesanbeterin · Hauhechel-Bläuling · Grüne Reiswanze · Mauerfuchs · Gartenkreuzspinne · Hausmutter · Kleiner Feuerfalter · Brauner Grashüpfer · Tigerschnegel · Deutsche Wespe …
- 🌿 Pflanzen **127** · Schmalblättriger Doppelsame · Luzerne · Echter Hopfen · Gemeiner Efeu · Gewöhnlicher Schneeball · Götterbaum · Quitte · Weinrebe · Herbstzeitlose · Weg-Distel · Portulak · Gemeine Wegwarte …
- 🍄 Pilze **4** · Gemeiner Schwefelporling · *Lentinus tigrinus* · Zunderschwamm · Ahorn-Runzelschorf
- 🐸 Amphibien **1** · Feuersalamander
- 🦎 Reptilien **5** · Barren-Ringelnatter · Zauneidechse · Blindschleiche · Mauereidechse · Äskulapnatter

### "Ganzes Jahr" — 46

Turmfalke · Gemeiner Efeu · Mauerraute · Felsentaube · Gewöhnliche Waldrebe · Bachstelze · Halsbandsittich · Grünspecht · Marmorierte Baumwanze · Dohle · Ringeltaube · Mäusebussard · Türkentaube · Rabenkrähe · Graureiher · Eichelhäher · Gartenbaumläufer · Elster · Star · Buntspecht · Kohlmeise · Gemeine Rosengallwespe · Stockente · Bluthänfling · Höckerschwan …

Example rows, share per mille Jan → Dez:

| Art | share | words |
| --- | --- | --- |
| Turmfalke | 16 · 15 · 12 · 14 · 13 · 12 · 12 · 14 · 21 · 17 · 15 · 14 | Ganzes Jahr |
| Hausrotschwanz | 4 · 0 · 12 · 19 · 15 · 12 · 11 · 9 · 19 · 14 · 3 · 1 | Mär–Okt |
| Zilpzalp | 1 · 1 · 14 · 15 · 9 · 8 · 5 · 8 · 19 · 15 · 4 · 3 | Mär–Okt |

## 📌 Left for M4

- The fixture's two-species gap between `year.mjs` (931) and `matrix.mjs` (929): decide whether the cut runs on the year facet or on the summed months. Same answer either way for the user; pick one.
- 101 species without a German name need a fallback order (en → sci) and a look at whether dewiki redirects recover some.
- GloBI's 1,000 cap: page or rank before storing.
- Words for species under 50 records flicker between refreshes; consider freezing to the year's shape.
- Kyoto's German-only warning line is a computed number, so the ETL must store per-species text language.
