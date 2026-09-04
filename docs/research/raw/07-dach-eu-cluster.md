# 🇩🇪 Raw: DACH / EU nature-ID & citizen-science landscape (researched 2026-09-04)

> Raw sub-agent output, lightly trimmed. Ratings scraped 2026-09-04 from Google Play DE / App Store DE. iNat network page, Observation.org API docs, de.observation.org bot-blocked.

## 1. Comparison table
| App | Operator / funding | Platforms | Price | Reach | ID tech | Gamification | Social | Data openness | Rating (Play / iOS DE) | Top weakness |
|---|---|---|---|---|---|---|---|---|---|---|
| **Flora Incognita** | TU Ilmenau + MPI-BGC; BMBF/BfN/BMUV grants | iOS, Android, Huawei | Free, no ads | >10M downloads, >60M DE ID requests ([MPG 2025](https://www.mpg.de/26484618/flora-incognita)) | CNN, ~32k plants, offline | Badges + levels ([Flora Incognita++](https://floraincognita.de/flora-incognita-plusplus/)) | None | No GBIF dataset | 4.87 (68k) / 4.8 (26k) | Plants only; no social; list UX |
| **Naturblick** | MfN Berlin; BMUV | iOS, Android | Free | ~120k users | Plant image + BirdNET sound, ~2.5k spp | None | None | Fully open source MIT ([GitHub](https://github.com/MfN-Berlin)) | 3.53 (676) / 4.4 (18) | Berlin-centric, sync bugs |
| **NABU Vogelwelt** | NABU + Sunbird Images | iOS, Android | Freemium: €5.99/yr sounds, €24.99/yr all-in | >2M downloads | Paid AI sound + photo, 315 spp | Quiz; feeds Stunde der Gartenvögel | None | Closed | **2.87 (1,673) / 3.3 (710)** | Paywall resentment, broken IAP restores |
| **NABU Insektensommer** | NABU | Web-app | Free | n/a | AI photo | Counting campaign | None | Closed | n/a | **Discontinued after 2024** |
| **NABU\|naturgucker MeldeApp** | naturgucker eG | Web, Android (Jan 2025), iOS (Feb 2026) | Free | >200k registered; 22.3M GBIF records | None ("planned") | Lottery-style Beobachtungswettbewerb (1 obs = 1 ticket) | Yes: friends, 1.7M comments | GBIF CC BY 4.0; grid-obscuring | n/a / **1.0 (2)** | Dated UX, no AI, buggy launch |
| **ObsIdentify / Observation.org** | Observation International (NL) | iOS, Android, web | Free | 584k users, 314M obs; 8.5M DE records | NIA AI, all EU taxa; 62% expert-validated | Badges per taxon group | Comments, validation | GBIF CC BY; API | 3.69 (1,903) / 3.9 (116) | GPS imprecision, no batch, no in-app correction, NL-centric |
| **BirdNET / BirdNET Live** | TU Chemnitz + Cornell; DBU | iOS, Android | Free | 6.4M downloads, 2M MAU | Sound AI; Live (Jul 2026): 8,927 birds + 862 other taxa, fully offline ([TU Chemnitz](https://www.tu-chemnitz.de/tu/pressestelle/aktuell/13580)) | None | Share to experts | Open-source models (NC) | 4.26 (13k) | Sound only; no lists |
| **ArtenFinder RLP** | Land RLP + SNU | **PWA**, not in stores | Free | 1.17M records on GBIF | Manual pick-list; >50 volunteer experts | None | Forum | **GBIF CC0**, weekly; → LANIS; 5×5 km obfuscation ([data paper 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12322675/)) | n/a | No AI, PWA discoverability |
| **Kinder-ArtenFinder** | SNU RLP | Web + booklet | Free | n/a | Booklet list | Discovery booklet | None | → ArtenFinder | n/a | A booklet on a screen |
| **iNaturalist / Seek** | US 501(c)(3) | iOS, Android, web | Free | 8.33M DE obs; 4.19M research-grade DE on GBIF | CV + community | Seek: badges, levels, challenges | Strong (iNat) | GBIF; full API | Seek 4.7 (1,050 iOS) | **No German network node**; Seek slow/unsure |
| **ornitho.de / NaturaList** | DDA; Biolovision | Web, Android, iOS | Free | >50k observers, >100M records | None; 500 validators | None | Low | **Closed**, application-based | n/a | Expert-only culture |
| **naturbeobachtung.at** | Naturschutzbund AT | iOS, Android, web | Free | since 2006 | Expert help | Contests, quizzes | Gallery, forum | NHM Wien; no GBIF | 5.0 (1) | Small, AT-only, iOS last update Aug 2024 |
| **Naturkalender (GeoSphere AT / SPOTTERON)** | GeoSphere | iOS, Android, web | Free | n/a | Phenology events | SPOTTERON points/ranks | Comments | Phenology DB | n/a | Niche |
| **InfoFlora FlorApp / Webfauna (CH)** | Info Flora / info fauna | iOS, Android | Free | n/a | FlorID AI; keys | None | None | 5×5 km public grid; sensitive lists (2025) | 4.1 (20) | 2FA loops, expert-oriented |
| **Waldfibel (BMLEH)** | Federal ministry | iOS, Android | Free | n/a | Tree key | Quiz, tree measuring | None | None | n/a | Static |
| **Artenquiz (Regio-Ranger)** | solo dev | iOS, Android | Free + IAP | n/a | Quiz only | Highscores, leaderboards | None | None | 3.4 (14) | Crashes, no logging |
| **ID-Logics** | Uni Bamberg | iOS, Android, desktop | Free | n/a | Interactive keys | None | None | None | n/a | No logging |

## 2. Selected details & sources
- **Flora Incognita:** phenology to DWD from 2026 ([floraincognita.de](https://floraincognita.de/)); iOS reviews: gallery tiles too large, no sorting ([App Store](https://apps.apple.com/de/app/flora-incognita/id1297860122)).
- **NABU Vogelwelt:** Play reviews "reichlich teuer", "alles kaufen oder abonnieren" ([NABU](https://www.nabu.de/natur-und-landschaft/natur-erleben/spiele-apps-klingeltoene/vogelwelt.html)). Stunde der Wintervögel 2026: 145k participants ([NABU](https://www.nabu.de/news/2026/01/36858.html)); Gartenvögel 2026: 56k ([NABU](https://www.nabu.de/news/2026/05/37165.html)).
- **naturgucker:** MeldeApp Android Jan 2025, offline, 720k taxa, no AI ([naturgucker](https://nabu-naturgucker.de/die-neue-meldeapp-ist-da/)); iOS Feb 2026 1.0★ ([App Store](https://apps.apple.com/de/app/nabu-naturgucker-meldeapp/id6756500905)); raffle contest w/ Swarovski binoculars ([contest](https://nabu-naturgucker.de/veranstaltungen/aktionen-und-wettbewerbe/beobachtungswettbewerb/beobachtungswettbewerb-2025-2026/)).
- **ArtenFinder RLP:** workflow photo → upload → expert check → LANIS; unproven records need 5 prior verified; obfuscation triggers eggs/nests/young/listed plants ([artenfinder.rlp.de](https://artenfinder.rlp.de/DasProjekt/Sofunktioniertes)).
- **iNat Germany:** 8,329,130 obs ([API](https://api.inaturalist.org/v1/observations?place_id=7207&per_page=0)); no DE/AT/CH network node (Luxembourg nearest; unverified, page 403).
- **ornitho.de:** >100M records, application-only, commercial fees ([DDA](https://www.dda-web.de/ornitho/datennutzung)).
- **Switzerland:** InfoSpecies policy 2025: 5×5 km public grid, Chapman 2020 sensitivity levels ([infospecies.ch](https://www.infospecies.ch/de/daten/datennutzung.html)).

## 3. DACH vs global
| DACH users have | Global users have (DACH lacks) |
|---|---|
| Best-in-class free plant AI (Flora Incognita), public-funded, no ads, privacy-first | A national iNaturalist node |
| Meldeportale wired into official conservation DBs (ArtenFinder → LANIS, CC0) | One "everything" collection app with community + gamification; DACH is siloed by taxon / region / NGO |
| Expert validation networks (500 ornitho, 50+ ArtenFinder) | Real-time social feeds, leaderboards |
| Mass counting events (145k Wintervögel) | Persistent year-round challenges / streaks |
| Offline bioacoustics (BirdNET Live) | Cross-taxon photo AI tied to a life list |
| Strong sensitive-species obfuscation culture | Simpler user-controlled geoprivacy |
| German species content (NABU 315 portraits, Naturblick 700) | Kid-safe collection UX with badges/levels |

## 4. Open data sources
| Source | Content | Access | License |
|---|---|---|---|
| GBIF API | 83.5M DE occurrences | REST, no key ([docs](https://techdocs.gbif.org/en/openapi/)) | per dataset |
| LAND (Lebendiger Atlas Natur Deutschlands) | German species pages/maps | [land.gbif.de](https://land.gbif.de/) | as GBIF |
| ArtenFinder dataset | 1.17M records | GBIF weekly | **CC0** |
| naturgucker dataset | 22.3M records | GBIF | CC BY 4.0 |
| Observation.org | 8.5M DE records | GBIF; own API (OAuth) | CC BY |
| iNaturalist | 8.3M DE obs | API v1 | per user |
| Rote-Liste-Zentrum CL-API | Checklists + concept relations | [swagger](https://checklisten.rotelistezentrum.de/api/public/swagger-ui), no registration | CC BY 4.0 |
| Rote-Liste-Zentrum Artensuchmaschine | Red List status ~36k spp | [search](https://www.rote-liste-zentrum.de/artensuchmaschine/) + downloads | public |
| FloraWeb (BfN) | 3,500 plant profiles; API `namebyid`, `taxonbyid` | [API](https://www.floraweb.de/ueberfloraweb/api.html) | n/a |
| WISIA (BfN) | Legal protection status | search UI only | n/a |
| LANIS RLP | Naturschutz geodata WMS/WFS; 2×2 km raster | [geodaten.naturschutz.rlp.de](https://geodaten.naturschutz.rlp.de/) | ODbL |
| Wikidata / Wikipedia DE | Taxon items, DE labels, images, IUCN | SPARQL / MediaWiki | CC0 / CC BY-SA |
| ornitho.de | 100M bird records | **application only** | closed |

## 5. Legal / privacy (Germany)
- Observer identity + location = personal data; photo EXIF and bystander voices too ([mit:forschen legal guide 2021](https://www.mitforschen.org/sites/default/files/grid/2021/01/19/Citizen_Science_rechtlicher_Leitfaden_19.01.2021_WEB.pdf)).
- Art. 8 DSGVO: parental consent under 16 in DE. Seek's no-account model sidesteps this.
- Sensitive-species obfuscation is the norm: ArtenFinder 5×5 km, LANIS 2×2 km, iNat 0.2° cell. Reference: [GBIF/Chapman 2020 four levels](https://docs.gbif.org/sensitive-species-best-practices/master/en/).
- **§ 44 BNatSchG**: publishing nest/roost sites of strictly protected species can enable "erhebliche Störung"; Zugriffsverbote forbid catching for ID photos ([gesetze-im-internet](https://www.gesetze-im-internet.de/bnatschg_2009/__44.html)). → No incentives to approach nests, no "catch" mechanics, auto-obscure Red List / Annex IV taxa.

## 6. Gaps
1. No German-language Pokédex-style collection app.
2. No cross-taxon app combining AI ID + life list + social + official data feed (ObsIdentify closest, 3.7★).
3. Kids/family segment empty in DE.
4. RLP wedge: ArtenFinder has CC0 data + validators + LANIS pipeline but no AI, no gamification, no store presence.
5. Insektensommer vacuum after 2024.
6. Rating gaps: NABU Vogelwelt 2.9, Naturblick 3.5, ObsIdentify 3.7, naturgucker iOS 1.0.
7. Offline is table stakes.
8. Data plumbing is free: GBIF + CL-API + FloraWeb + Wikidata.
