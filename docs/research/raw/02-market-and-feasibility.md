# 📈 Raw: Market & tech feasibility (research date 2026-09-04)

> Raw sub-agent output, lightly trimmed. ⚠️ marks items the agent could not re-verify.

## PART 1 — Market

### 1.1 Market size (heavy skepticism warranted)
| Source | 2024/25 size | Forecast | CAGR |
|---|---|---|---|
| [Verified Market Research](https://www.verifiedmarketresearch.com/product/plant-identification-apps-market/) | $176M (2024) | $519M (2032) | 14.6% |
| [DataHorizzon](https://datahorizzonresearch.com/global-plant-identification-apps-market-48763) | $285M (2024) | $1.2B (2033) | 17.3% |
| [Strategic Market Research](https://www.strategicmarketresearch.com/market-report/plant-identification-apps-market) | $450M (2024) | $950M (2030) | 12.4% |
| [Dataintelo](https://dataintelo.com/report/plant-identification-apps-market) | $1.8B (2025) | $5.6B (2034) | 13.5% |

A 10x spread between vendors is a tell: SEO-farmed, not measured. Hard anchor: PictureThis did **>$13M net revenue in May 2022** ([Appfigures](https://appfigures.com/resources/insights/20220610/amp?f=3)); Sensor Tower shows ~$5M/month iOS US + ~$0.7M/month Android US early 2026. **Working estimate: $300–600M/yr global consumer spend, dominated by one player.**

### 1.2 User bases
| App | Owner / model | Scale | Source |
|---|---|---|---|
| iNaturalist | Independent 501(c)(3) since 2023 | ~300M observations (2025-08); 5.0M registered users; ~400k MAU | [Wikipedia](https://en.wikipedia.org/wiki/INaturalist), [iNat blog](https://www.inaturalist.org/blog/123031-impact-highlights-from-2025) |
| Seek | Free, no account, kid-safe | 7.5M+ downloads; ~31k iOS ratings; "maintenance mode" since 2025 | [MWM](https://mwm.ai/apps/seek-by-inaturalist/1353224144), [dobudex](https://dobudex.com/best-real-life-pokedex-apps) |
| Merlin Bird ID | Cornell, free, donor-funded | 4.8M US users (2026-07, from 279k in 2019); ⚠️ ~40M downloads; usage +40% US / +70% EU spring 2025 | [Fortune 2026-08](https://fortune.com/2026/08/23/gen-z-birding-analog-hobby-college-bird-watching/), [CNN](https://www.cnn.com/world/gen-z-birdwatching-boom-intl-spc) |
| PictureThis | Glority (CN), sub $29.99–39.99/yr | ~700k iOS US downloads/month; revenue/download $6.68 vs PlantIn $3.71, Blossom $2.25 | Sensor Tower, Appfigures |
| PlantIn | Genesis (UA), sub | 35M downloads (2025) | [Wikipedia](https://en.wikipedia.org/wiki/PlantIn) |
| Pl@ntNet | INRIA/CIRAD/IRD | tens of millions users; 100k–700k DAU; API passed 100M IDs (2026-02) | [docs](https://docs.plantnet.org/en/introduction-to-plantnet/), [blog](https://plantnet.org/en/2026/02/02/the-plntnet-api-reaches-100-million-identifications/) |
| Flora Incognita | TU Ilmenau + MPI, BfN-funded | 5–10M downloads; ~300k IDs/day; 150k downloads/30d (2026-06) | [floraincognita.de](https://floraincognita.de/flora-incognita-plusplus/), [AppBrain](https://www.appbrain.com/app/flora-incognita/com.floraincognita.app.floraincognita) |

### 1.3 Business models
| Model | Works | Doesn't |
|---|---|---|
| Paid sub ($30–40/yr) | PictureThis: 8-figure revenue via aggressive Apple Search Ads + hard paywall | Only one winner |
| Freemium €3/mo | Every 2026 dex game | All <10 ratings; retention unproven |
| NGO / grant | iNat ($1.5M Google.org 2025), Flora Incognita, Pl@ntNet, Merlin | Not for a for-profit solo founder; Google grant triggered [community backlash](https://www.scientificamerican.com/article/google-ai-grant-to-inaturalist-prompts-community-outcry/) |
| Hardware + app | Bird Buddy $28.1M Series A (2024-11), ~$36.7M total; Haikubox TIME Best Invention 2024 | Capital-intensive |
| B2B API | Pl@ntNet API, Kindwise | You're a buyer, not seller |
| Education licensing | Seek/iNat in classrooms, but free | Nobody charges schools successfully here |

**Funding 2023–2026:** only Bird Buddy's Series A is a real consumer round. VC goes to hardware + AI and B2B biodiversity MRV, not consumer software.

### 1.4 Adjacent trends
| Trend | Data point | Relevance |
|---|---|---|
| Gen Z birding boom | UK 16–29 birders ~750k, +1,088% since 2018 (RSPB 2026-05); US 25–34 participation quadrupled since 2016; Audubon campus chapters 0 → 117 | Demographic exists; Merlin owns birds |
| "Analog hobby" / touch grass | Fortune, CNN frame birding as screen detox | Design for "phone down, look up" |
| Biodiversity credits | $0.74B → $12.4B (2032), same 10x spread problem | Ignore unless B2B pivot |
| Nature-positive / TNFD | 1,200+ companies with commitments | Speculative CSR bio-blitz sponsor budget |
| Schools | Seek/iNat default; iNat 13+ | Seek is free and privacy-first, hard to beat |

## PART 2 — Tech feasibility (1 dev, Next.js/tRPC/Prisma/Postgres)

### 2.1 Species identification
| Option | Coverage | Accuracy | Cost | License | Offline | Verdict |
|---|---|---|---|---|---|---|
| iNaturalist CV API | ~90k taxa | Best for in-situ wild organisms | Negotiated | **Not public**; partners only; ToS bans commercial AI training ([forum](https://forum.inaturalist.org/t/hidden-computer-vision-api/41775)). Only ~500-taxa small model open (MIT, [model-files](https://github.com/inaturalist/model-files)) | small model only | Don't plan around it |
| Pl@ntNet API | ~50–60k plants | Solid for wild plants | **Free 500 IDs/day**; Pro €1,000/yr min, €0.005/ID; non-profit free w/ logo ([pricing](https://my.plantnet.org/pricing)) | EU-hosted | No | Plants: start here |
| Kindwise (plant.id / insect.id / mushroom.id) | Plants, insects, mushrooms | plant.id top-1 error 12% vs GPT-4 Turbo 58% (vendor test 2024) | €0.05/credit → €0.01 at scale; 100 free ([pricing](https://www.kindwise.com/pricing)) | Commercial | No | Stopgap for non-plants |
| Gemini / GPT multimodal | Everything + text | **Poor at species**: GPT-5 & Gemini 2.5 Pro ~10–12% on RealBirdID ([arXiv 2026-03](https://arxiv.org/html/2603.27033)); <65% fine-grained plants ([LeafBench](https://arxiv.org/html/2602.13662)) | ~$0.001–0.01/img | Standard | No | Explanations + coarse routing only |
| **BioCLIP 2** (Imageomics) | 952k taxa | Zero-shot NABirds 96.8%, insects 83.8%, mean 55.6%; 17% on hard RealBirdID | Self-host ViT-L/14 | **MIT** ([HF](https://huggingface.co/imageomics/bioclip-2)) | Too big for phone; server | Best open backbone |
| timm iNat2021 fine-tunes | 10k species | High on iNat21 val ⚠️ | Self-host | Apache-2.0; check dataset terms | Large | Good server classifier |
| BirdNET (audio) | ~6k species | Standard | Free | **CC BY-NC-SA models**; commercial needs Cornell license ([GitHub](https://github.com/birdnet-team/BirdNET-Analyzer)) | Yes (TFLite) | Blocker for paid app |
| Merlin models | ~2k sound species | Excellent | — | Proprietary | — | Unavailable |
| Apple Visual Look Up | Plants, animals | Decent | Free | No API output | On-device | Unusable as backend |

**Recommendation:** Pl@ntNet (plants) + Kindwise or self-hosted BioCLIP 2 (animals/fungi) behind one `identify` procedure; Gemini for "why / fun fact" text. 10k MAU × 5 IDs/month ≈ €500–1,000/month. Self-hosting BioCLIP 2 on a ~€100/mo GPU box wins above ~50k IDs/month.

### 2.2 Species data for the dex
| Need | Source | License |
|---|---|---|
| Taxonomy backbone | GBIF Backbone (`api.gbif.org/v1/species/match`), free, no key | CC0 / CC BY |
| Authoritative names | Catalogue of Life via [ChecklistBank](https://api.checklistbank.org) | CC0 / CC BY |
| Phylogeny | [Open Tree of Life API](https://github.com/OpenTreeOfLife/opentree/wiki/Open-Tree-of-Life-APIs) | CC0 |
| Descriptions, DE/EN names | Wikidata (P846 GBIF ID → QID → wiki) | CC0 (Wikidata), CC BY-SA (Wikipedia text) |
| Images | Wikimedia Commons (Wikidata P18), iNat CC0/CC BY photos | **Store attribution per image**; exclude NC if monetised |
| Sounds | Xeno-canto API v3 (API key since 2025-10) | Mostly CC BY-NC-SA; filter CC BY/CC0 |
| Regional checklist DE | ~72k species in DE ([Rote-Liste-Zentrum](https://www.rote-liste-zentrum.de/en/red-list-centre/)); GBIF 83.5M DE occurrences | Mixed, per-dataset |

**Realistic dex scope:** the ~2,000–5,000 species people actually encounter. GBIF facets + iNat `species_counts?place_id=…`, threshold by observation count, enrich via Wikidata. A weekend ETL into Postgres.

### 2.3 "What can I find here right now?"
| Source | Endpoint | Terms |
|---|---|---|
| iNaturalist | `observations/species_counts?lat&lng&radius&month` | ≤60/min, ≤10k/day recommended ([practices](https://www.inaturalist.org/pages/api+recommended+practices)); cache per grid cell / month |
| GBIF | `v2/map/occurrence/density/{z}/{x}/{y}` + `occurrence/search?month=` | Free, generous, ready-made heatmaps ([demo](https://api.gbif.org/v2/map/demo.html)) |
| eBird API 2.0 | hotspots, recent nearby | Key required; **commercial use needs written permission** ([terms](https://confluence.cornell.edu/display/CLOISAPI/eBird+API+Terms+of+Use)) |

### 2.4 Hybrid stack
| Option | Code sharing w/ Next.js stack | Camera / GPS / offline | Store | Solo-dev realism |
|---|---|---|---|---|
| **Capacitor + Next.js (static export)** | ~95% | Camera & geo via plugins; background location weak; offline via SQLite plugin | Yes | **Highest.** Risk: WebView feel; Apple 4.2 "repackaged website" if thin |
| Expo (RN) + Next.js | tRPC types, zod, logic shared; UI + routing not (Solito) | Best native | Yes | Medium; two UI codebases in practice |
| Expo only (Expo Router web) | Drop Next.js | Native-grade | Yes | Medium; weaker web SEO/SSR |
| PWA only | 100% | Camera & GPS ok; no background sync; iOS evicts storage after ~7 days unused ([MagicBell 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)) | **No store** | MVP validation only |
| Flutter | 0% | Excellent | Yes | Low for you |

**Recommendation:** Next.js PWA for 4–8 weeks of validation; wrap with Capacitor for store launch; Expo only if background GPS trails or on-device ML become essential.

### 2.5 App store pitfalls
| Risk | Rule | Mitigation |
|---|---|---|
| Kids | Apple 1.3/5.1.4; Play Families: child-targeted apps may not request location; "appeals to children" art can trigger reclassification ([Play](https://support.google.com/googleplay/android-developer/answer/9893335)) | Declare 13+ (new Apple tiers since 2026-01-31); avoid cartoon-kid positioning |
| Location | Apple 5.1.5; Play prominent disclosure | "While using" only; no background in v1 |
| Account deletion | Apple 5.1.1(v) mandatory | Build day 1 |
| IAP | Apple 3.1.1; loot-box odds must be disclosed | Publish drop rates if card packs; RevenueCat |
| Minimum functionality | Apple 4.2 WebView rejections | Native touches: camera flow, haptics, offline dex |
| Endangered species | Not a store rule; poaching risk | Obscure coordinates for Red-List species |
| Licence leakage | BirdNET NC, Xeno-canto NC, iNat NC photos | Filter CC0/CC BY; per-asset attribution table |

## 🧭 Agent's verdict
1. The ID engine is a commodity to buy or borrow, not a moat.
2. The dex-game niche is real but unproven; ten near-identical apps, all <10 ratings. Test *retention*, not card prettiness.
3. Germany-first is a genuine wedge (Flora Incognita / Naturblick slow, Seek in maintenance, none fun). *(Note: user chose global; see synthesis.)*
4. Monetisation ceiling is low without capital or B2B.
5. Licensing is the sneakiest risk. Decide paid vs free before choosing data sources.

**Cheapest next step:** PWA, Pl@ntNet free tier + Kindwise trial, GBIF-derived dex, 100 users, measure D30 retention.
