# 🔬📇 [0019] Findings — the Steckbrief grill

> Companion to [handoff 0019](0019-steckbrief-grill.md). No decision is taken here; every S-row has an empty Decision cell for the owner. Scripts: [`app/scripts/steckbrief-probe/`](../../app/scripts/steckbrief-probe/README.md), tables in its `coverage.md`, `gift.md`, `drafts.md`.

| 🗓️ Date | 👤 Owner | 🗺️ Taxa | 📡 Requests | 💸 Spend |
| --- | --- | --- | --- | --- |
| 2026-09-06 | Sven Reiser, with Claude Fable 5.1 | 1 869 in four sets: Mainz-Bingen 929 · Schagen 902 · Südwestpfalz 583 · Kyoto 303 | GBIF 807 · Wikidata 38 SPARQL + 1 · GIFT 12 · figshare 5 · Anthropic 51 | **0.56 $** (0.36 kept + 0.19 wasted on thinking, §S3) |

---

## 📊 S1 · Coverage per field per tile

Tiles as in the DB: 🦋 insect 886 (incl. spiders, snails) · 🌿 plant 643 · 🐦 bird 147 · 🍄 fungus 110 · 🐟 fish 30 · 🦌 mammal 24 · 🐸 amphibian 16 · 🦎 reptile 13.

### Bulk datasets, joined by scientific name (30 GBIF synonym lookups for the misses)

| field | 🦋 | 🌿 | 🐦 | 🍄 | 🐟 | 🦌 | 🐸 | 🦎 | all |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mass (g) | 0 | 0 | **99 %** | 0 | 0 | **100 %** | **100 %** | 0 | 10 % (186) |
| length / wing (mm) | 0 | 0 | 99 % | 0 | 0 | 79 % | 100 % | 0 | 10 % |
| habitat | 0 | 0 | 99 % | 0 | 0 | 79 % | 100 % | 0 | 10 % |
| migration | 0 | 0 | 99 % | 0 | 0 | 0 | 0 | 0 | 8 % |
| diet / trophic niche | 0 | 0 | 99 % | 0 | 0 | 100 % | 69 % | 0 | 10 % |
| activity (day/night) | 0 | 0 | 97 % | 0 | 0 | 100 % | 69 % | 0 | 10 % |
| longevity · litter · maturity | 0 | 0 | 0 | 0 | 0 | 100 % | 81–100 % | 0 | 2 % |

| dataset | rows | file | licence | join | refresh |
| --- | --- | --- | --- | --- | --- |
| AVONET 1 (BirdLife) | 11 009 | `AVONET1_BirdLife.csv` 2.7 MB inside `ELEData.zip` (figshare 16586228) | **CC BY 4.0** | 146 / 147 birds (miss: *Parus cinereus*) | file in repo, static since 2022 |
| EltonTraits 1.0 | 9 994 birds · 5 401 mammals | `BirdFuncDat.txt` 2.2 MB · `MamFuncDat.txt` 0.6 MB (figshare 3559887) | **CC0** | 143 / 147 · 24 / 24 | file, static since 2014 |
| PanTHERIA 1.0 | 5 416 | `PanTHERIA_1-0_WR05_Aug2008.txt` 2.4 MB (figshare 5604752, ESA archive) | ESA data paper; figshare says CC BY 4.0, the archive itself names none | 24 / 24 | file, static since 2008 |
| AmphiBIO v1 | 6 776 | `AmphiBIO_v1.csv` 1.1 MB (figshare 4644424) | **CC BY 4.0** | 16 / 16 | file, static since 2017 |
| European butterfly traits (Middleton-Welling 2020) | 542 | Dryad `doi:10.5061/dryad.6m905qfx6`, xlsx | CC0 | **not probed**: the API wants a bearer token, the web stream answers 403 to scripts. Download by hand once | file |

The four vertebrate datasets are **9 MB in the repo** or ~200 joined rows in the DB. They cover 197 taxa, **10 % of the set**. Everything a walker meets most, insects and plants (82 % of the set), gets nothing from them.

### GIFT for the plants (open API, no key, 12 calls)

| GIFT field | plants | of 643 |
| --- | --- | --- |
| flowering start · end | 540 · 535 | **84 %** |
| pollination (wind, insect …) | 524 | 81 % |
| dispersal | 475 | 74 % |
| habitat (free text: "forest, meadows, roadsides") | 444 | 69 % ¹ |
| height max (m) | 421 | **65 %** |
| life form (Raunkiær) | 297 | 46 % |
| lifecycle (annual, perennial) | 280 | 44 % |
| growth form (herb, shrub, tree) | 222 | 35 % |
| flower colour | 135 | 21 % |
| **any trait** | **575** | **89 %** |

¹ the habitat and aquatic queries return exactly 10 000 rows: an API page cap, so these two are undercounts. Name join 594 / 643 (*Taraxacum officinale* is one of the misses: GIFT keys the aggregate differently). Licence: the API is open, the trait values come from published floras; Weigelt et al. 2020 says unpublished checklists are restricted, traits are not. **No licence line on the API.** One mail to the Göttingen group before shipping; citation "Weigelt, König & Kreft 2020, J. Biogeogr." either way.

### Wikidata, 1 853 QIDs in 38 SPARQL batches of 50

| property | 🦋 | 🌿 | 🐦 | 🍄 | 🐟 | 🦌 | 🐸 | 🦎 | all |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wingspan P2050 | 2 % | 0 | 84 % | 0 | 0 | 13 % | 0 | 0 | 8 % |
| mass P2067 | 0 | 0 | 64 % | 0 | 0 | 21 % | 0 | 15 % | 5 % |
| length P2043 · height P2048 | 0 | 0 | 1 % | 0 | 7 % | 8 % | 0 | 15 % | 0 % |
| main food P1034 | 1 % | 0 | 10 % | 0 | 3 % | 25 % | 6 % | 15 % | 2 % |
| habitat P2974 | 0 | 4 % | 3 % | 0 | 3 % | 29 % | 0 | 0 | 2 % |
| **fungi: edibility P789** | | | | **58 %** | | | | | |
| fungi: spore print P787 · ecological type P788 · cap shape P784 | | | | 45 · 45 · 42 % | | | | | |
| xeno-canto id P2426 | 3 % | 0 | **99 %** | 0 | 0 | 79 % | 50 % | 0 | 11 % |
| AnAge P4024 | 15 % | 0 | 76 % | 0 | 43 % | 88 % | 19 % | 62 % | 16 % |
| EOL id P830 | 77 % | 90 % | 54 % | 81 % | 70 % | 92 % | 81 % | 69 % | 80 % |
| vernacular de P1843 · en | 23 · 48 % | 72 · 91 % | 48 · 99 % | 21 · 34 % | 50 · 67 % | 71 · 100 % | 31 · 88 % | 31 · 85 % | 43 · 68 % |

Wikidata quantities come without units through `wdt:` (Kranich wingspan "2.22", Amsel "36"; Kleiner Feuerfalter "25.5"): a unit-aware query or `wbgetentities` is needed before any number is shown. Wikidata sizes are 0 % for plants and 2 % for insects: **Wikidata is not the size source** for the 82 %. Its one real gift is the **mycomorphbox for fungi**: edibility on 58 % of the 110, the only structured edible/poisonous source found.

### GBIF vernacular, sample of 777 (all non-plant non-insect + 260 plants + 260 insects)

| | 🦋 | 🌿 | 🐦 | 🍄 | 🐟 | 🦌 | 🐸 | 🦎 | all |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| de name in GBIF | 85 % | 92 % | 99 % | 85 % | 60 % | 100 % | 88 % | 100 % | **89 %** |
| en name in GBIF | 86 % | 96 % | 100 % | 93 % | 90 % | 100 % | 100 % | 100 % | **93 %** |
| de name in the DB today (dewiki title) | 72 % | 88 % | 99 % | 67 % | 60 % | 96 % | 69 % | 100 % | 80 % |
| en name in the DB today | 24 % | 7 % | 99 % | 3 % | 67 % | 96 % | 75 % | 85 % | **25 %** |

GBIF's vernacular endpoint would lift English names from 25 % to 93 % and German from 80 % to 89 %, one call per taxon, inside the content job that already calls GBIF. Quality unchecked (GBIF mixes sources; "Eichhoernchen" style entries exist).

### What a plant page and a fungus page can have at all

| tile | fields that exist for ≥ 40 % | source | never found |
| --- | --- | --- | --- |
| 🌿 plant | Blütezeit (84 %), Bestäubung (81 %), Ausbreitung (74 %), Lebensraum (69 %), Höhe (65 %), Lebensform (46 %), Lebensdauer (44 %) | GIFT | edible/poisonous, leaf/flower description |
| 🍄 fungus | Speisewert (58 %), Sporenpulver (45 %), Ökologie: Mykorrhiza/Saprobiont (45 %), Hutform (42 %) | Wikidata P789/P787/P788/P784 | size, months (only the month profile) |
| 🦋 insect | nothing beyond the month profile and GloBI | — | size, wingspan, flight months, host plants (the butterfly db would give all four for ~100 of the 886) |
| 🐦 bird | mass, wing, habitat, migration, diet, activity, lifespan | AVONET + Elton + AnAge | song (S2) |
| 🦌 🐸 | mass, length, longevity, litter, maturity, habitat, activity, diet | PanTHERIA / Elton / AmphiBIO | — |
| 🦎 🐟 | IUCN only, AnAge 43–62 % | — | everything else |

**Not probed** (tokened): EOL TraitBank, IUCN API v4, TRY. None would change the picture: TraitBank is thin on European insects, IUCN habitat covers the 25 % that have a status, TRY is a research licence with per-request approval.

---

## 🔊 S2 · Voice

`XENO_CANTO_API_KEY` is absent from `app/.env.local` (checked by name). The v3 endpoint answers **HTTP 401** without a key, v2 is switched off ("no longer available", verified). The docs page sits behind BotStopper, which the probe does not bypass; the shapes below come from the API's own error body, the client wrappers on GitHub and the P2426 proxy.

| xeno-canto group | set species | Mainz-Bingen | Südwestpfalz | Schagen | Kyoto | with Wikidata P2426 id |
| --- | --- | --- | --- | --- | --- | --- |
| birds | 147 | 69 | 47 | 96 | 39 | 146 (99 %) |
| frogs (Anura) | 11 | 4 | 3 | 3 | 6 | 8 (73 %) |
| grasshoppers (Orthoptera) | 32 | 16 | 26 | 8 | 2 | 31 (97 %) |
| bats | 3 | 0 | 0 | 3 | 0 | 3 (100 %) |

P2426 says the species exists on xeno-canto, not that a quality-A clip exists; for European birds and Orthoptera it will. **One region = 90–120 species with a voice**, 0 for the other five tiles.

| question | answer |
| --- | --- |
| API | `GET https://xeno-canto.org/api/3/recordings?query=sp:"Turdus merula" grp:birds q:A&key=…`, `per_page` ≤ 100, groups `birds · grasshoppers · frogs · bats`. Key from the account page, free, 1 request/s is the wrappers' convention |
| Which clip | `q:A`, `type:song` over `call`, shortest `length`; `sounds.mjs` has the ranking and runs as is once the key exists |
| Licence | Every clip carries its own `lic` URL; the bulk is **CC BY-NC-SA 4.0**, some BY-NC-ND (no cropping), a few BY-SA. NC is fine under free-forever (spec §🗄️ already says so for BirdNET); **ND forbids the crop to 10 s** |
| The row | `♪ Gesang · 0:14 · Recordist XC123456 · CC BY-NC-SA` with the ⓘ sheet linking `https://xeno-canto.org/123456`; attribution per clip as for images (§⚖️) |
| Bytes | mp3 at 128 kbit/s ≈ 16 KB/s: a 15 s clip ≈ 240 KB, a 60 s one ≈ 1 MB. One region ≈ 110 clips × 0.5 MB ≈ **55 MB** in Blob (≈ 0.2 ¢/month storage, transfer 5 ¢/GB) |
| Stream or store | Hotlinking `file` URLs makes the page depend on xeno-canto's uptime and their hotlink policy (docs unreachable to scripts, so unknown). Storing in Blob under the clip's licence is what the images already do; **store**, the same `Asset` row with `kind: 'sound'` |

---

## ✍️ S3 · Prose

Ten species, Sonnet 5, de and en, fact sheets from `facts.mjs` (5–13 facts each: GBIF rank, names, IUCN, AnAge, AVONET/Elton/PanTHERIA/AmphiBIO, Wikidata quantities and mycomorphbox, GIFT, GloBI edges with German names, month profile per region). **No Wikipedia text anywhere in the pipeline.** Full drafts with the judge's marks: [`drafts.md`](../../app/scripts/steckbrief-probe/drafts.md); prompt and JSON shape in `prose.mjs:17-38`.

| measure | result |
| --- | --- |
| Validator (every sentence ≥ 1 cite, ids exist, 2 paragraphs, ≤ 170 words) | **18 / 20 pass**; Amsel de: a third empty paragraph; Amsel en: 175 words. Both trivially repaired by the prompt |
| Judge (second Sonnet call, sentence vs its cited facts) | 129 sentences: **75 supported (58 %) · 39 partial (30 %) · 15 unsupported (12 %)** |
| What "unsupported" is, read by hand | Sonnet's own knowledge leaking in: "glänzend schwarze Haut mit gelben Flecken" (Feuersalamander), "stinging leaves" (Brennnessel), "hunting rather than building webs" (Nosferatu), "so walkers can still hope to spot one on a warm early-summer evening" (Hirschkäfer). All true, none in the facts. The citation rule does not stop it: the model cites F2 (the German name) for the appearance |
| What "partial" is | adjectives ("unscheinbar", "stattlich"), a unit asserted where the sheet said unknown (Kranich 2.22 m), reading "eats Rotbuche" as "larvae eat wood" (right, but not in the fact) |
| Fact noise reaching the text | GloBI: Amsel "eats … Klatschmohn, Gemeiner Flieder, Schwarz-Pappel" (correct, seeds), Brennnessel "eats" bird lice (nonsense, the model dropped it as told), Fliegenpilz eaten by *Sciurus niger* (a US squirrel, dropped) |
| Thinking | Sonnet 5 thinks by default; with `max_tokens` 1 500 it spent all 1 500 on thinking on 11 of 20 drafts and returned nothing (19 ¢ wasted). `thinking: { type: 'disabled' }` fixed it; the drafts did not get worse |
| Caching | `cache_creation_input_tokens` stayed **0**: the shared instruction block is ~520 tokens, under Sonnet's 1 024-token minimum. The per-species facts (800–1 800 tokens) dominate anyway; caching buys ≤ 5 % here |

### Cost per call (Sonnet 5: 2 $ in · 10 $ out per MTok, no cache)

| call | input tokens | output tokens | ¢ | ms |
| --- | --- | --- | --- | --- |
| prose, one language, median | 1 500 (900–2 300) | 900 (700–1 250) | **1.0** (0.5–1.4) | 7 500 |
| judge, one language, median | 1 400 | 800 | 1.0 (0.35–1.4) | 6 000 |
| **per species, de + en, with judge** | | | **≈ 4 ¢** | 30 s |

Real spend: 0.36 $ for the 40 kept calls + 0.19 $ for the 11 thinking-truncated ones = **0.56 $**.

### The three drafts the owner should read first

**Fliegenpilz de** (validator ✓, judge 3 supported 2 partial):
> Der Fliegenpilz zeigt einen gewölbten bis ausgebreiteten Hut und hinterlässt einen weißen Sporenabdruck. In Mainz-Bingen wurde er in den letzten zehn Jahren vor allem im Oktober und November gefunden, mit einem deutlichen Höhepunkt im Oktober und schon spürbarem Auftreten im September. — Er lebt in Mykorrhiza mit Bäumen, tauscht also Nährstoffe über die Wurzeln aus. Am Waldboden wird er von Tieren wie dem Waldmistkäfer und dem Tigerschnegel gefressen. Für Menschen gilt er als Giftpilz mit psychoaktiver Wirkung, wird aber auch in der Mykotherapie genannt.

**Nosferatu-Spinne de** (validator ✓, judge 4 / 4 supported, 5 facts in):
> Bei dieser Art handelt es sich um eine Spinne aus der Ordnung Araneae, die unter dem deutschen Namen Nosferatu-Spinne bekannt ist. Im Landkreis Mainz-Bingen wurde sie innerhalb von zehn Jahren 1077-mal gemeldet, wobei die Hauptzeit von August bis November liegt. Die meisten Beobachtungen fallen auf den September, während im Früh­sommer nur wenige Tiere auffallen. — Auf ihrem Speiseplan stehen andere Spinnen sowie Schmetterlinge, die sie erbeutet.

**Feuersalamander de** (validator ✓, judge 2 unsupported):
> Der Feuersalamander ist an seiner glänzend schwarzen Haut mit gelben Flecken oder Streifen zu erkennen und erreicht eine Körperlänge von bis zu 280 mm. ❌ Er ist tag-, nacht- und dämmerungsaktiv und lebt sowohl am Boden, unter der Erde als auch im Wasser. In Mainz-Bingen wurde er vor allem im März bis Mai sowie von August bis Dezember beobachtet, mit einem deutlichen Höhepunkt im Oktober. — Auf seinem Speiseplan stehen vor allem Gliederfüßer … Die Fortpflanzung erfolgt lebendgebärend beziehungsweise eiablegend im Wasser ❌ …

The honest one is dull ("Bei dieser Art handelt es sich um eine Spinne"), the readable one cheats. That is the whole S3 question.

---

## 🗄️ S4 · Schema, proposed

```sql
-- 0019: Steckbrief prose and voice. Taxon.facts keeps its shape and gains keys.
ALTER TABLE "Taxon" ADD COLUMN "prose" JSONB;
ALTER TABLE "Taxon" ADD COLUMN "sound" JSONB;
ALTER TABLE "Taxon" ADD COLUMN "factsAt" TIMESTAMP(3);
```

| column | shape | rule |
| --- | --- | --- |
| `facts` (exists) | `{ size: {value, source, url}, mass, wingspan, habitat, migration, diet, activity, lifespan, reproduction, flowering, pollination, height, lifeform, edibility, sporePrint, ecology }`, each `{ value: string, source: string, url?: string, licence?: string }` | new keys per tile from §S1; `source` is the dataset name, `licence` new (CC BY needs the line) |
| `prose` | `{ de: { paragraphs: [{ sentences: [{ text, cites: ['F3'] }] }] }, en: {…}, facts: [{ id, source, text }], model: 'claude-sonnet-5', judged: { supported, partial, unsupported }, at }` | written once; rewritten when `factsAt` > `prose.at`; the fact list is stored so the citations stay resolvable after facts change |
| `sound` | none. Use `Asset` with `kind: 'sound'`: `{ url (Blob), origin: 'xeno-canto', sourceUrl, licence, attribution: recordist, meta: { xcId, type: 'song', length: 14, quality: 'A' } }` | one per taxon; the `Asset` table already has the licence and attribution columns the ⓘ sheet reads |

The content job gains three steps after GloBI: **traits** (bulk files in `app/etl/data/`, GIFT calls for plants, Wikidata mycomorphbox for fungi) → **sound** (one xeno-canto call, one Blob put) → **prose** (two Sonnet calls + optional judge, only when facts exist beyond rank and name). `--purge` clears all three.

---

## 🎨 S5 · The page

**A · data first** (the current structure, filled)

```
Steckbrief
┌──────────┬──────────┬──────────┐
│ Größe    │ Blütezeit│ Status   │   ← cells only where facts exist (as today)
│ bis 1,5 m│ Mai–Okt  │ Pflanze  │
│ GIFT     │ GIFT     │ LC       │
├──────────┴──────────┴──────────┤
│ ♪ Gesang · 0:14 · CC BY-NC-SA  │   ← voice row, birds/frogs/grasshoppers only
├────────────────────────────────┤
│ Die Große Brennnessel blüht    │   ← prose, two paragraphs, faint "KI-Text aus
│ von Mai bis Oktober …          │      12 Quellen ⓘ" line, sheet lists the facts
└────────────────────────────────┘
Quellen: Text: Wikipedia CC BY-SA · Daten: GBIF, Wikidata, GIFT, AVONET · Stimme: xeno-canto
```

**B · prose first**: prose replaces the Wikipedia intro at the top, cells below as a compact strip, voice row under the slider.

**Recommendation: A.** The cells are what the data honestly supports (every number has one source behind its ⓘ); the prose is the layer that can be wrong and must sit *under* the numbers it was written from, labelled as generated. B puts the least trustworthy text where the Wikipedia intro sits today and would tempt dropping the intro before the prose deserves it. Empty stays empty: no cells, no prose paragraph, the grey "noch keine Angaben" line only when a tile *could* have facts (birds, mammals, amphibians, plants, fungi) and has none.

---

## 💸 S6 · Cost of the whole

| item | 1 869 taxa, four sets | per new region (≈ 600–900 taxa, ~40 % new) | notes |
| --- | --- | --- | --- |
| Prose de + en, no judge | 1 869 × 2 × 1.0 ¢ = **37 $** | 250–350 new taxa ≈ 6 $ | thinking off, no cache benefit |
| + judge on every draft | +37 $ = **75 $** | +6 $ | or judge a 10 % sample: +4 $ |
| Sounds, one region | 110 clips ≈ 55 MB Blob, storage ≈ 0.2 ¢/month, ETL 110 requests | same | transfer 5 ¢/GB served |
| Trait files in the repo | 9 MB (AVONET, Elton ×2, PanTHERIA, AmphiBIO) | 0 | or ~200 joined rows in `facts`, KB |
| GIFT | 12 API calls, 0 $ | 0 (same 12 calls, cached) | one species list of 380 k rows, 30 MB cached |
| GBIF vernacular | 1 869 calls in the content job | 300 | free |
| Wikidata mycomorphbox | 38 SPARQL calls | 6 | free |

Prose is the only line with a real price and it is one-off: **37 $ once, ~6 $ per region**, on the same key as the scan.

---

## 🗳️ S1–S6 · Proposals and the empty Decision cells

| # | Proposal | Decision |
| --- | --- | --- |
| S1 | **Ship data, in this order: GIFT for plants, Wikidata mycomorphbox for fungi, AVONET + Elton + AmphiBIO + PanTHERIA for the vertebrates, GBIF vernacular for the English names.** That turns "any Steckbrief fact" from 8 % to roughly **50 %** of the set (plants 89 %, birds 99 %, mammals/amphibians 100 %, fungi 58 %) and gives the two biggest tiles their first cells: Blütezeit, Höhe, Bestäubung; Speisewert. Insects stay at 0 %: nothing open covers 886 species, and the butterfly database (CC0, needs a manual download) would cover ~100. **Not worth shipping:** Wikidata sizes (0 % plants, 2 % insects), EOL/IUCN/TRY tokens (weeks of admin for the 25 % that already have IUCN). Mail the GIFT group before the first deploy | |
| S2 | **Ship voice, second.** Get the key (five minutes), run `sounds.mjs`, store one quality-A clip per bird, frog and grasshopper in Blob as an `Asset kind:'sound'` with the clip's own licence and the recordist's name; skip ND clips rather than cropping. 90–120 species per region, 55 MB, no money. It is the one row that makes a bird page feel alive and the licence question is already answered by spec §🗄️ | |
| S3 | **Do not ship prose yet.** 12 % of sentences state what no fact says and the sentence-level citation rule does not stop it: Sonnet cites the German name for the salamander's colours. A judge pass halves the text budget and still lets "partial" through (30 %). The honest drafts (Nosferatu) read like a database; the readable ones (Feuersalamander) are Wikipedia by another route. Revisit after S1 lands: with 8–15 real facts the model has less reason to reach. If the owner wants prose anyway: judge every draft, drop any sentence not "supported", never show prose for taxa with < 6 facts, label it "KI-Text aus n Quellen" | |
| S4 | `facts` gains keys and `licence`; `prose JSONB` with the fact list embedded; **no `sound` column**, an `Asset kind:'sound'` row instead; `factsAt` for the rewrite rule. Migration by hand in Vercel's build command as the rules say | |
| S5 | **A, data first.** Cells where facts exist, voice row under them, generated prose last and labelled. Empty stays empty | |
| S6 | 37 $ once for prose if it ever ships, 0 $ for everything else; per region ≈ 6 $ prose, 55 MB Blob | |

---

## 🤔 Doubts for the owner

| # | Doubt |
| --- | --- |
| 1 | **GIFT's licence is unstated.** The API is open and the traits are literature values, but the project has no licence line. If the mail goes unanswered, the fallback for Blütezeit is nothing; FloraWeb has no API, BiolFlor is offline since 2024, TRY needs approval per request |
| 2 | **GloBI noise becomes prose.** "Amsel frisst Klatschmohn" and "Hirschkäfer frisst Rotbuche" are edges the page already shows as chips; in a sentence they read as claims. Prose from GloBI needs the E9 kinds pruned harder (only in-set partners with a German name) |
| 3 | **PanTHERIA's licence** is "ESA data paper" on the archive and CC BY 4.0 on figshare's wrapper. Elton and AVONET are clean; if in doubt, drop PanTHERIA: Elton + AnAge cover the 24 mammals' mass, diet and lifespan |
| 4 | **Wikidata quantities need units.** The probe's `wdt:` values are bare numbers; the build must read `psv:` with `wikibase:quantityUnit`. Until then, no Wikidata number on a page |
| 5 | **The judge is Sonnet judging Sonnet.** Its verdicts matched my reading on the 15 unsupported, but it also reversed itself mid-sentence twice (Amsel s5). A human reads the ten before any prose ships |
| 6 | The handoff said three regions plus Kyoto; the dev DB has **four European sets** (Schagen is new since 0012). The numbers above include it |
| 7 | **Insects are 47 % of the set and get nothing.** If the owner wants a Steckbrief for the butterfly on the path, the Dryad download is a one-time manual step (CC0); everything else (Orthoptera, beetles, bugs, spiders) has no open trait source at all. The month profile and GloBI are the insect Steckbrief |

## 🔀 For the merge

- Branch `m9b-grill`, one commit: `app/scripts/steckbrief-probe/` (7 scripts, README, `taxa.json` 0.9 MB, `coverage.*`, `gift.*`, `facts.json`, `prose.json`, `drafts.md`, `sounds.json`), `.gitignore` (+ `app/scripts/steckbrief-probe/.cache/`), this file. No app code, no schema change, no migration.
- `app/.env.local` does not exist in the worktree (env files are not in git); `prose.mjs` took `ENV_FILE=` pointing at the main checkout's file, names only. Nothing was written there.
- `.cache/` is 97 MB (the five datasets, the 380 k-row GIFT species list, 900 GBIF answers, 40 Sonnet answers) and stays out of git.
- Record `docs/records/0004-steckbrief.md` is written after the Decision cells are filled.

---

## 📜 Appendix · the twenty drafts

Copied from [`drafts.md`](../../app/scripts/steckbrief-probe/drafts.md). `[F3]` = cited facts, ⚠️ = judge "partial", ❌ = judge "unsupported", the judge's reason under each draft.

#### Amsel · *Turdus merula* (bird)
**de** · validator: 3 paragraphs, expected 2; p2: no sentences · 1.03 ¢
> Die Amsel ist ein mittelgroßer Singvogel mit rund 100 g Gewicht, einer Flügellänge von etwa 128 mm und einem Schwanz von über 10 cm. [F1,F2,F7] Der Schnabel ist mit fast 3 cm vergleichsweise lang. [F7] In Mainz-Bingen kann man sie das ganze Jahr über beobachten, mit den meisten Sichtungen im Winter von Dezember bis Februar und einem Rückgang im Spätsommer. [F11] ⚠️
>
> Als Allesfresser und Bodengeneralist sucht die Amsel vor allem am Boden nach Nahrung, wobei wirbellose Tiere den größten Anteil ausmachen, ergänzt durch Früchte, Samen und gelegentlich kleine Wirbeltiere. [F7,F8] ⚠️ Zu ihrem Speiseplan gehören auch Pflanzen wie Vogelknöterich, Rotbuche, Behaartes Schaumkraut, Ranunculus ficaria, Klatschmohn, Gemeiner Flieder, Schwarz-Pappel und Echte Nelkenwurz. [F10] ❌ Sie lebt überwiegend ortstreu in dichteren Waldlebensräumen und zieht kaum über weite Strecken. [F7] ❌ Die Geschlechtsreife wird mit etwa einem Jahr erreicht, und in freier Wildbahn kann eine Amsel über 20 Jahre alt werden. [F6,F5] Der Bestand gilt weltweit als nicht gefährdet. [F4]
>
- s3 partial: F11 shows Nov-Jan as high months, not specifically Dec-Feb as 'winter peak' framing; Feb is lower than Jan/Nov/Dec, slight overreach in framing
- s4 partial: 'Bodengeneralist' not a defined term in facts; F7 lists primary lifestyle as Generalist, not specifically ground-related label
- s5 unsupported: omits that Aesculus hippocastanum and Cardamine hirsuta etc. are separate items; also drops Symphytum officinale and Helleborus foetidus without issue, but lists items accurately except missing none critical—actually check: all listed items are in F10, so this is supported
- s6 unsupported: F7 habitat density 2 does not clearly mean 'dense forest', and migration 1 sedentary is a stretch beyond simple classification; adds interpretive claim not directly stated

**en** · validator: 175 words · 0.90 ¢
> The Common blackbird, known in German as Amsel, is a familiar songbird of the order Passeriformes, weighing around 100 g with a wing length of about 128 mm and a tail near 106 mm. [F1,F7] Its beak measures roughly 29 mm, and its wingspan is about 36 in the units recorded. [F7,F9] It favours forest habitats of medium density and tends to stay in one place year-round rather than migrate. [F7] In Mainz-Bingen it can be seen throughout the year, with sightings peaking in January and again in November and December, and dipping lowest in August. [F11]
>
> This bird is a generalist omnivore, feeding mostly on invertebrates and plant matter, including fruit and seeds, and it forages mainly on the ground. [F7,F8] Among the plants it has been recorded eating are Vogelknöterich, Rotbuche, Behaartes Schaumkraut, Gewöhnliche Rosskastanie, Klatschmohn, Gemeiner Flieder, Schwarz-Pappel, Echter Beinwell and Echte Nelkenwurz. [F10] It reaches maturity at about one year old and can live as long as nearly 22 years in the wild. [F6,F5] The species is currently classified as Least Concern, meaning it faces no particular threat. [F4]
>

#### Kleiner Feuerfalter · *Lycaena phlaeas* (insect)
**de** · validator: 3 paragraphs, expected 2; p2: no sentences · 1.01 ¢
> Der Kleine Feuerfalter (F2) ist ein Schmetterling aus der Ordnung der Falter (F1) mit einer Flügelspannweite von rund 25,5 mm (F3). [F2,F1,F3] ❌ In Mainz-Bingen lässt er sich vor allem von April bis Mai und dann wieder von Juli bis Oktober beobachten, mit einem deutlichen Höhepunkt im September (F8). [F8] Schon im März zeigen sich erste Tiere, während es im Winter keine Nachweise gibt (F8). [F8] ⚠️
>
> Die Raupen fressen unter anderem an Vogelknöterich, Vogel-Wicke, Wiesen-Sauerampfer und Zypressen-Wolfsmilch (F4). [F4] ❌ Als Falter besucht er Blüten wie Scharbockskraut, Vogel-Wicke, Echte Nelkenwurz und die Gewöhnliche Kratzdistel und trägt dabei zur Bestäubung bei, etwa bei Möhre, Hundsrose oder Efeu (F5, F6). [F5,F6] Zu seinen Fressfeinden zählen Vögel wie Rauchschwalbe, Star, Kleiber, Haussperling und Mönchsgrasmücke (F7). [F7]
>
- s1 unsupported: F3 wingspan given as 25.5 cm/m, converting to mm without basis; also order is Lepidoptera not literally 'Falter' but that's fine, main issue is unit conversion to mm not supported
- s3 partial: F8 shows März only 7% of peak, calling it 'erste Tiere' implies onset which is plausible but adds interpretive claim not directly stated
- s4 unsupported: F4 lists these as general food plants (eats), not specifically raupen (larval) diet

**en** · validator ✓ · 1.18 ¢
> The Kleiner Feuerfalter, known scientifically as Lycaena phlaeas, is a small butterfly belonging to the insect order Lepidoptera. [F1,F2] ⚠️ In Mainz-Bingen it has been recorded mainly from March through October, with the strongest numbers in September and a second strong spell in April and July, while winter months show no sightings at all. [F8] ⚠️
>
> Its caterpillars feed on common wayside plants such as Vogelknöterich, Wiesen-Sauerampfer, Zypressen-Wolfsmilch and Vogel-Wicke. [F4] Adults visit the flowers of plants like Scharbockskraut, Vogel-Wicke and Gewöhnliche Kratzdistel for nectar, and in doing so they help pollinate species such as Hundsrose, Möhre and Gemeiner Efeu. [F5,F6] It in turn serves as prey for many garden and hedgerow birds, including Haussperling, Star, Rauchschwalbe and Mönchsgrasmücke. [F7]
>
- s1 partial: 'small' size claim not supported by cited facts F1,F2
- s2 partial: Includes March as part of main season and mischaracterizes April/July as second peak, ignoring August which is higher

#### Fliegenpilz · *Amanita muscaria* (fungus)
**de** · validator ✓ · 1.19 ¢
> Der Fliegenpilz zeigt einen gewölbten bis ausgebreiteten Hut und hinterlässt einen weißen Sporenabdruck. [F6,F4] In Mainz-Bingen wurde er in den letzten zehn Jahren vor allem im Oktober und November gefunden, mit einem deutlichen Höhepunkt im Oktober und schon spürbarem Auftreten im September. [F9]
>
> Er lebt in Mykorrhiza mit Bäumen, tauscht also Nährstoffe über die Wurzeln aus. [F5] ⚠️ Am Waldboden wird er von Tieren wie dem Waldmistkäfer und dem Tigerschnegel gefressen. [F7] ⚠️ Für Menschen gilt er als Giftpilz mit psychoaktiver Wirkung, wird aber auch in der Mykotherapie genannt. [F3]
>
- s3 partial: F5 only states mycorrhiza type, not the nutrient exchange mechanism via roots
- s4 partial: F7 does not mention 'Waldboden' as location

**en** · validator ✓ · 0.95 ¢
> The Fliegenpilz, known in German simply as Fliegenpilz, shows a domed cap that flattens out as it ages. [F2,F6] ⚠️ Its spores print white when the cap is laid on paper. [F4] ⚠️ In Mainz-Bingen it has been recorded mainly in October, with smaller numbers already appearing in September and lingering into November. [F9] Sightings are rare in spring, turning up only occasionally in March and May before the main autumn season begins. [F9] ⚠️
>
> It lives as a mycorrhiza partner, linking its threads to the roots of trees rather than feeding on dead wood alone. [F5] ❌ Various animals feed on it, including the Waldmistkäfer and the Tigerschnegel, which graze on its flesh. [F7] ⚠️ For people it counts as a poisonous and psychoactive mushroom, sometimes mentioned in mycotherapy contexts, so it is not one to eat. [F3]
>
- s1 partial: F6 lists shapes but doesn't state a developmental sequence 'flattens as it ages'
- s2 partial: F4 only states spore print colour, not the paper-printing method
- s4 partial: F9 shows April at 0%, not mentioned, and 'rare in spring' generalizes beyond given months
- s5 unsupported: F5 only states mycorrhiza type; claim about not feeding on dead wood is unsupported
- s6 partial: F7 only lists species that eat it, not that they 'graze on its flesh'

#### Feuersalamander · *Salamandra salamandra* (amphibian)
**de** · validator ✓ · 0.89 ¢
> Der Feuersalamander ist an seiner glänzend schwarzen Haut mit gelben Flecken oder Streifen zu erkennen und erreicht eine Körperlänge von bis zu 280 mm. [F2,F5] ❌ Er ist tag-, nacht- und dämmerungsaktiv und lebt sowohl am Boden, unter der Erde als auch im Wasser. [F5] In Mainz-Bingen wurde er vor allem im März bis Mai sowie von August bis Dezember beobachtet, mit einem deutlichen Höhepunkt im Oktober. [F8]
>
> Auf seinem Speiseplan stehen vor allem Gliederfüßer, darunter Schnecken wie der Schwarze Schnegel sowie verschiedene Insekten und Spinnen. [F5,F7] ⚠️ Zu seinen Fressfeinden zählen unter anderem der Kranich und der Kleine Wasserfrosch. [F6] Die Fortpflanzung erfolgt lebendgebärend beziehungsweise eiablegend im Wasser, wobei die Weibchen 8 bis 54 Larven oder Eier absetzen und die Tiere ab einem Alter von etwa 3 Jahren geschlechtsreif werden. [F5] ❌ Feuersalamander können bis zu 24 Jahre alt werden, gelten laut Roter Liste der IUCN aber als gefährdet (VU). [F5,F4]
>
- s1 unsupported: Coloring/pattern not in cited facts
- s4 partial: Spiders (Spinnen) as separate category and 'Schnecken' generalization not clearly supported; Limax is a slug not snail plural claim overreaches
- s6 unsupported: Adds 'im Wasser' for reproduction location, not stated in F5

**en** · validator ✓ · 1.05 ¢
> The Feuersalamander is a stout, dark amphibian that can reach up to about 28 cm in length. [F2,F5] ❌ It is active by day, at dusk and at night, moving between burrows, forest floor and damp water edges. [F5] In Mainz-Bingen it is seen mainly from March to May and again from August to December, with sightings peaking sharply in October. [F8]
>
> It hunts small invertebrates such as the Schwarzer Schnegel among many other prey items. [F7] In turn it can fall prey to animals like the Kranich and the Kleiner Wasserfrosch. [F6] Females give birth to live larvae rather than laying eggs on land, producing clutches of roughly 8 to 54 young, and individuals mature from about three years old. [F5] Some fire salamanders live to be as old as 24 years. [F5] The species is currently classified as Vulnerable on the IUCN Red List, a reminder to walkers to leave its damp woodland habitat undisturbed. [F4] ❌
>
- s1 unsupported: No fact describes appearance as 'stout' or 'dark'
- s8 unsupported: No fact provides advice about walkers or habitat disturbance

#### Große Brennnessel · *Urtica dioica* (plant)
**de** · validator ✓ · 1.11 ¢
> Die Große Brennnessel ist eine krautige Pflanze, die auf Landflächen wächst. [F2,F4] ❌ In Mainz-Bingen wurde sie in den letzten zehn Jahren an 259 Stellen gefunden, wobei die meisten Beobachtungen zwischen April und Juli liegen und Mai der häufigste Monat ist. [F9] ⚠️ Ihre Blütezeit reicht von Mai bis Oktober. [F5]
>
> Die Blüten werden vom Wind bestäubt, und die Samen verbreiten sich ebenfalls über den Wind. [F5] Viele Insekten fressen an ihr, darunter der Siebenpunkt-Marienkäfer. [F6] Sie dient zudem als Wirtspflanze für Pilze und Insekten, zum Beispiel für den Braunen Bär. [F7] Nach der Roten Liste der IUCN gilt die Art als nicht gefährdet. [F3]
>
- s1 unsupported: 'krautige Pflanze' (herbaceous) is not stated in any cited fact.
- s2 partial: F9 gives 259 observations, not 259 distinct locations ('Stellen').

**en** · validator ✓ · 1.21 ¢
> The Große Brennnessel, as it is called in German, is a tall, upright plant with stinging leaves that spreads over Landfläche wherever it can take root. [F2,F4] ❌ It flowers from May through October, with wind carrying its pollen and its seeds later drifting away on the breeze. [F5] In Mainz-Bingen it is mostly noticed between April and July, with sightings climbing sharply in April, peaking in May, and tapering off through the summer months. [F9] ⚠️
>
> Its leaves feed a long list of small creatures, among them the Siebenpunkt-Marienkäfer, which finds a steady meal on the plant. [F6] ⚠️ The Brauner Bär caterpillar also depends on it as a host plant, alongside numerous fungi that settle on its stems and leaves. [F7] Reproduction happens through its wind-pollinated flowers and wind-dispersed seeds, letting new plants establish some distance from the parent. [F5] Overall, the species is classified as Least Concern, meaning it faces no particular threat at present. [F3]
>
- s1 unsupported: Adds unsupported details like 'tall, upright' and 'stinging leaves' not present in F2/F4
- s3 partial: Describes a smooth taper after May peak, but data shows a rise in July (37%) before falling, not a simple taper
- s4 partial: Adds unsupported behavioural claim 'finds a steady meal' not in F6

#### Nosferatu-Spinne · *Zoropsis spinimana* (insect)
**de** · validator ✓ · 1.40 ¢
> Bei dieser Art handelt es sich um eine Spinne aus der Ordnung Araneae, die unter dem deutschen Namen Nosferatu-Spinne bekannt ist. [F1,F2] Im Landkreis Mainz-Bingen wurde sie innerhalb von zehn Jahren 1077-mal gemeldet, wobei die Hauptzeit von August bis November liegt. [F4] Die meisten Beobachtungen fallen auf den September, während im Früh­sommer nur wenige Tiere auffallen. [F4]
>
> Auf ihrem Speiseplan stehen andere Spinnen sowie Schmetterlinge, die sie erbeutet. [F3]
>

**en** · validator ✓ · 0.50 ¢
> The Nosferatu-Spinne is a spider (Arachnida, Araneae) rather than an insect, despite what some records suggest. [F1,F2] ⚠️ In Mainz-Bingen it has been recorded 1077 times over ten years, with sightings possible year-round but concentrated from August through November. [F4] Numbers rise sharply in August, peak in September, and then decline through October, November and December, so late summer and early autumn are the best times to spot it. [F4]
>
> It feeds on other spiders and on moths and butterflies, hunting rather than building webs for prey capture. [F3] ❌ As a predator within the Araneae, it likely interacts with a range of other spider species it preys upon. [F3] ⚠️
>
- s1 partial: F1 labels it 'tile insect' but does not say records suggest it's an insect; that framing is unsupported speculation
- s4 unsupported: F3 gives no info about hunting behavior or web-building
- s5 partial: the predator/prey relation is supported but 'likely interacts with a range of' is speculative addition

#### Kranich · *Grus grus* (bird)
**de** · validator ✓ · 1.00 ¢
> Der Kranich ist ein großer, langbeiniger Vogel mit einem Körpergewicht von rund 5,5 kg und einer Flügellänge von etwa 54 cm, dessen Gefieder ihn schon aus der Ferne erkennbar macht (F6). [F6] ⚠️ Die Flügelspannweite liegt bei etwa 2,22 m (F8). [F8] ⚠️ In Mainz-Bingen zeigt er sich vor allem im Februar sowie von Oktober bis Dezember, mit dem stärksten Auftreten im Februar und einem zweiten Höhepunkt im November (F12). [F12] Er ist als Zugvogel unterwegs und hält sich bevorzugt in offenen Feuchtgebieten auf (F6). [F6] ⚠️
>
> Als Allesfresser nimmt der Kranich eine breite Mischung aus pflanzlicher und tierischer Nahrung zu sich, wobei Samen und andere Pflanzenteile einen großen Anteil ausmachen, ergänzt durch Wirbellose, kleine Wirbeltiere und Früchte, die er meist am Boden sucht (F7, F9). [F7,F9] ❌ Zu seiner Beute zählen unter anderem der Grasfrosch und der Alpenstrandläufer (F10). [F10] Die Rabenkrähe wiederum zählt zu seinen Fressfeinden (F11). [F11] In freier Wildbahn kann der Kranich bis zu 43 Jahre alt werden (F5). [F5] Nach der Roten Liste der IUCN gilt die Art derzeit als nicht gefährdet (F4). [F4]
>
- s1 partial: F6 has no info on body shape (long-legged, large) or plumage recognizability
- s2 partial: F8 unit ambiguous, sentence asserts meters as certain
- s4 partial: F6 gives migration score 3 (migratory) but 'bevorzugt offene Feuchtgebiete' overstates habitat density value, though habitat is wetland; open preference not stated
- s5 unsupported: F9 only states 'Allesfresser', F7 dominant is PlantSeed not necessarily large plant share phrased this way; overall roughly matches but claims 'meist am Boden' plus mix fine, still fine as partial not unsupported - reconsider

**en** · validator ✓ · 1.39 ¢
> The Common crane is a large bird of open wetlands, weighing around 5.5 kg. [F6] It has long wings of roughly 54 cm and a beak about 11 cm long, giving it a striking silhouette. [F6] ⚠️ In Mainz-Bingen it is best seen from October to December and again in February, when migrating flocks pass through. [F12] ⚠️
>
> As an omnivore, it feeds mainly on seeds and other plant material, supplemented by invertebrates and small vertebrates such as the Grasfrosch and Alpenstrandläufer. [F7,F9,F10] It can itself fall prey to the Rabenkrähe. [F11] In the wild, common cranes can live up to 43 years. [F5] The species is currently classified as of Least Concern. [F4]
>
- s2 partial: ‘striking silhouette’ is an added descriptive claim not in F6
- s3 partial: F12 gives only observation timing, not a claim about migrating flocks passing through

#### Hirschkäfer · *Lucanus cervus* (insect)
**de** · validator ✓ · 0.73 ¢
> Der Hirschkäfer (Lucanus cervus) ist ein großes Käferinsekt aus der Ordnung der Coleoptera, das man an seinen namensgebenden, geweihartig vergrößerten Mundwerkzeugen erkennt. [F1,F2] ⚠️ In Mainz-Bingen wurde die Art in zehn Jahren 63-mal gemeldet, wobei die Hauptflugzeit im Juni und Juli liegt. [F6] Nach dem Monatsprofil steigen die Sichtungen ab Mai deutlich an, erreichen im Juni ihren Höhepunkt und klingen bis August wieder ab. [F6]
>
> Als Larve ernährt sich der Hirschkäfer von Holz verschiedener Laubbäume wie Rotbuche, Vogelkirsche und Gemeiner Esche. [F5] ❌ Ausgewachsene Tiere und Larven werden ihrerseits von Vögeln wie dem Turmfalken sowie von Laufkäfern gefressen. [F4] ⚠️ Die Art gilt weltweit als nicht gefährdet und wird auf der Roten Liste als LC eingestuft. [F3]
>
- s1 partial: large size and antler-like mouthparts detail not in facts
- s4 unsupported: facts say eats these plants, not specifically 'wood as larva'
- s5 partial: facts don't distinguish adults vs larvae being eaten

**en** · validator ✓ · 1.11 ¢
> This is a beetle, a member of the insect order Coleoptera, known in German as the Hirschkäfer. [F1,F2] In Mainz-Bingen it is seen mainly from June to July, with numbers rising already in May and tapering off through the summer. [F6]
>
> Its larvae feed on wood from trees such as the Rotbuche, the Vogelkirsche and the Gemeine Esche. [F5] ⚠️ Adults and larvae can fall prey to birds such as the Turmfalke. [F4] ⚠️ The species is currently assessed as of least concern, so walkers can still hope to spot one on a warm early-summer evening. [F3] ❌
>
- s3 partial: F5 only lists eats relationships, not larvae/wood feeding specifics
- s4 partial: F4 lists eatenBy but doesn't specify life stages (adults and larvae)
- s5 unsupported: Added claim about walkers spotting one on warm evenings not in any fact

#### Grasfrosch · *Rana temporaria* (amphibian)
**de** · validator ✓ · 0.97 ¢
> Der Grasfrosch wird bis etwa 110 mm groß und ist an seiner kräftigen, oft bräunlichen Gestalt zu erkennen. [F2,F5] ⚠️ In Mainz-Bingen sieht man ihn hauptsächlich zwischen Februar und April, mit einem deutlichen Höhepunkt im März. [F10] Außerhalb dieser Laichzeit wird er im Landkreis nur noch selten gemeldet. [F10] ⚠️
>
> Er lebt sowohl an Land als auch im Wasser und ist tag- wie nachtaktiv. [F5] ⚠️ Auf seinem Speiseplan stehen vor allem Gliedertiere, etwa Larven von Schnaken sowie verschiedene Fliegen, Köcherfliegen, Regenwürmer und auch die Garten-Bänderschnecke. [F5,F6,F8] ⚠️ Zu seinen Fressfeinden zählen unter anderem Rotfuchs und Saatkrähe. [F7] Er kann von Nematoden befallen werden, was seine Gesundheit belasten kann. [F9] ⚠️ Die Fortpflanzung erfolgt durch Laichballen mit 265 bis 4000 Eiern, aus denen sich Kaulquappen entwickeln, bevor die Tiere ab einem Alter von etwa zwei Jahren geschlechtsreif werden. [F5] ⚠️ Ein Grasfrosch kann bis zu 27 Jahre alt werden und gilt nach der Roten Liste als nicht gefährdet. [F5,F4]
>
- s1 partial: 'kräftige, oft bräunliche Gestalt' not supported by facts
- s3 partial: low activity outside peak not equivalent to 'selten gemeldet'; overinterprets numbers
- s4 partial: omits arboreal habitat, otherwise fine but not full claim issue; minor addition none, but habitat list incomplete not an overclaim so consider supported
- s5 partial: 'Laichballen' term and mention of Regenwürmer/Bänderschnecke as staple is stretched but Lumbricidae and Cepaea are in F8, so mostly fine; 'vor allem' overgeneralizes
- s7 partial: 'was seine Gesundheit belasten kann' is an added inference not in facts
- s8 partial: 'Laichballen' and 'Kaulquappen' details not explicitly stated, though implied by larval development; slight overspecification

**en** · validator ✓ · 0.84 ¢
> The common frog, known in German as Grasfrosch, can grow up to about 110 mm long. [F2,F5] In Mainz-Bingen it is mostly seen from February to April, with sightings peaking sharply in March and falling off by May. [F10] Its habitats include damp ground, water bodies, and even low vegetation, matching its terrestrial, aquatic, and arboreal lifestyle. [F5] ⚠️ It can be active by both day and night. [F5]
>
> It feeds mainly on arthropods such as fly larvae and crane flies, but has also been recorded eating caddisflies, blowflies, earthworms, and even a Garten-Bänderschnecke. [F5,F6,F8] ⚠️ It in turn falls prey to many animals, including the Rotfuchs, the Saatkrähe, and the Kranich. [F7] It can also host parasitic roundworms. [F9] Females lay large clutches of anywhere from 265 to 4000 eggs, and young frogs reach maturity from about two years of age, developing through an aquatic larval stage. [F5] Individuals can live remarkably long, up to 27 years. [F5] The species is currently assessed as Least Concern. [F4]
>
- s3 partial: 'damp ground', 'water bodies', 'low vegetation' are added descriptive interpretations not in fact
- s5 partial: F6 lists main food as Larve, Tipuloidea; caddisflies/blowflies/earthworms/snail come from F8 which is 'eats' list, fine, but 'mainly' framing for arthropods plus specific F6 items combined without distinction is borderline; still acceptable as claims match facts

#### Schwarz-Erle · *Alnus glutinosa* (plant)
**de** · validator ✓ · 0.98 ¢
> Die Schwarz-Erle ist ein Baum, der bis zu 25 m hoch werden kann und zu den Blütenpflanzen aus der Ordnung der Buchenartigen zählt. [F1,F4] Von April bis April blüht sie unscheinbar und lässt ihre Blüten vom Wind bestäuben, die Früchte werden ebenfalls durch den Wind verbreitet. [F4] ⚠️ Man findet sie an Seen, Flüssen, Ufern und in Sümpfen, also überall dort, wo es feucht bis nass ist. [F4] In Mainz-Bingen lässt sie sich das ganze Jahr über beobachten, mit auffälligen Häufungen im Dezember und Januar sowie einem weiteren Anstieg im August und September. [F7] ⚠️
>
> Als Wirtspflanze beherbergt die Schwarz-Erle zahlreiche Organismen, darunter Pilze wie die Schmetterlings-Tramete, den Rotrandigen Baumschwamm und den Gemeinen Schwefelporling sowie Falter wie den Lindenschwärmer und den Buchen-Streckfuß. [F6] Auch als Nahrungsquelle spielt sie eine Rolle, etwa für den Moschusbock, den Braunen Bär, den Halsbandsittich und die Saatkrähe. [F5] Als mehrjährige Pflanze wächst sie über viele Jahre zu einem stattlichen Baum heran. [F4] ⚠️ Die Schwarz-Erle gilt nach der Roten Liste der IUCN als nicht gefährdet. [F3]
>
- s2 partial: 'unscheinbar' (inconspicuous) is an added descriptor not in facts
- s4 partial: month profile shows Dec peak and Jan high, but Aug/Sep is not clearly 'another rise' beyond other months like Jun; slightly overstates pattern
- s7 partial: 'stattlichen Baum' (stately/impressive tree) is an added descriptor not in facts

**en** · validator ✓ · 0.73 ¢
> The Schwarz-Erle is a tree that can grow up to 25 m tall, found along lakes, rivers, shores and swamps. [F2,F4] It flowers in April, with wind carrying the pollen and the seeds later dispersed by wind as well. [F4] In Mainz-Bingen it can be spotted throughout the year, though sightings peak strongly in December and are also frequent in January and August. [F7]
>
> This tree hosts a wide range of life, including caterpillars such as the Lindenschwärmer and Buchen-Streckfuß, fungi like the Schmetterlings-Tramete and Gemeiner Schwefelporling, and lichens such as the Furchen-Schüsselflechte. [F6] Its leaves and wood are eaten by various insects and birds, among them the Moschusbock, Brauner Bär and the Saatkrähe. [F5] ⚠️ As a perennial, it lives for many years and is currently classified as Least Concern, meaning it faces no particular threat. [F4,F3] ⚠️
>
- s5 partial: Facts don't specify leaves and wood are eaten, only that species eatenBy exist
- s6 partial: LC does not mean 'no particular threat', that's an added interpretation

