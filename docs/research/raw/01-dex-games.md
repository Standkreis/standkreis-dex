# 🔎 Raw: "nature Pokédex" dex-game apps (state 2026-09-04)

> Raw sub-agent output, lightly trimmed. Synthesis lives in `docs/research/01-market-research.md`.

**Headline:** a micro-genre of "dex game" apps appeared late 2025 → mid 2026, almost all solo-dev, server-side AI, iOS-first, tiny user bases. Break-out traction: **Birdex (UK)**, the one that does *not* use AI ID. Self-published genre comparison: [dobudex.com/best-real-life-pokedex-apps](https://dobudex.com/best-real-life-pokedex-apps) (2026-07-10). **Seek went into maintenance mode Apr 2025**; this wave fills that vacuum.

## 🟢 Confirmed, active direct competitors

### 1. Birdex 🐦 (UK)
| | |
|---|---|
| Positioning | "Collect birds like Pokémon", UK birds only, honor-system logging, cards + XP |
| Platforms / model | iOS + Android; free, no microtransactions ([Android Police 2026-03](https://www.androidpolice.com/this-pokemon-birding-app-is-only-reason-im-going-outside/)) |
| Traction | Launched Feb 2026; >200k sightings within weeks ([Time Out](https://www.timeout.com/uk/news/you-can-collect-birds-like-pokemon-with-a-new-birdwatching-app-that-has-launched-in-the-uk-021926)); Android ~16k downloads ([AppBrain](https://www.appbrain.com/app/birdex-uk-birdwatching-app/com.birdex.app)) |
| Team | Harry Scott (24, marketing) + friends, 6-month side project |
| ID tech | None. Manual ID, photo optional |
| Gamification | Cards w/ unlockable backgrounds, per-bird levels, XP, ranks, "seeds" currency, daily quests, weekly bingo, daily quiz, login streaks, leaderboards, badges |
| Social | Discord, friend competition ([birdexapp.com](https://birdexapp.com/)) |
| Data | No BTO/eBird/GBIF integration, no export |
| Weaknesses | AI-generated card art (backlash), UK-only, no auto-ID, no nesting-season guidance, cheating trivial |

### 2. Gotcha: Animal Identifier 📸 (NL solo dev)
| | |
|---|---|
| Positioning | Camera cuts creature out of background → sticker fills a silhouette dex ([gotcha.jurre.me](https://gotcha.jurre.me/)) |
| Platforms / model | iOS; free + Gotcha+ IAP $3.99–59.99 |
| Traction | Launched June 2026; 4.6★ / 124 ratings ([App Store](https://apps.apple.com/us/app/gotcha-animal-identifier/id6778118327)) |
| ID tech | Server-side AI, 900+ species, 6 rarity tiers |
| Gamification | Silhouette dex, rarity, daily quests, achievements, sets, leaderboards, widgets |
| Weaknesses | No gallery import (must catch live), misIDs (dog → raccoon), missing species |

### 3. dobudex 🎴 (EU)
Pixel-art collectible cards with 6 battle stats, earned rarity. iOS Jul 2026, Android Aug 2026; 10 free scans then €2.99/mo. Server-side AI, online only. No community. ([dobudex.com](https://dobudex.com/best-real-life-pokedex-apps))

### 4. Wildex 🦊 (UK, DREAMPRESS LTD)
"Pokémon Go for real wildlife" ([Show HN 2026-02, 106 pts](https://news.ycombinator.com/item?id=47040390)). iOS; free, ad-funded inference. Holographic cards, 5 rarities, XP, quests, streaks, leaderboards ([App Store](https://apps.apple.com/us/app/wildex-identify-plants-animals/id6748092158)). 4.7★ / 6 ratings, slowing since Mar 2026. **HN critique:** mushroom misID danger, points incentivise approaching wildlife / entering protected areas, poaching-location risk, mandatory location + ad trackers, "Seek already does this free". Reviews: crab → dog, no way to fix/delete a misID.

### 5. Animalis: Catch Real Animals ⚔️
Photo-capture → team → turn-based battles → real parks as gyms ([playanimalis.com](https://playanimalis.com/)). iOS; £3.99/mo, £24.99/yr, $69.99 lifetime. Solo dev, very active. 4.1★ / 8 ratings ([App Store](https://apps.apple.com/us/app/animalis-catch-real-animals/id6762081213)). On-device AI claimed; anti-spoof added after players photographed pictures. IUCN status + endangered bonus, PvP, trading. Weaknesses: battery, non-native suggestions, spoofing.

### 6. BioSnap: Animal Identifier 🃏
AI ID + collectible card game (packs, deck, Ranger levels). iOS; Bio Gems IAP, BioPass $9.99. Solo dev. **4.8★ / 571 ratings** ([App Store](https://apps.apple.com/us/app/biosnap-animal-identifier/id6770793658)), highest in genre. Includes dinosaurs → not a real-nature product. Cheating via Google Images, no offline, blurry camera.

### 7. Snappit: Nature Identifier 👨‍👩‍👧 (US, kids 3–7)
9,000+ species cards, rarity, themed collections, badges, streaks, world map ([snappit.app](https://www.snappit.app/real-life-pokedex)). iOS + Android; $2.99/mo / $12.99/yr. ~8 ratings; no updates since Apr 2026 → stalling.

### 8. Wildcard Dex 🔁 (Play Outside Games)
Only genre app with friend-code **card trading** ([wildcarddex.com](https://wildcarddex.com/)). iOS + Android; free w/ ads + daily caps, Dex++ $2.99/mo. 10 research ranks, rotating quests, coarse-location globe for privacy. Too few ratings to display.

### 9. Bird Buddy 🪶 (hardware + app)
Smart feeder → auto bird "postcards" → collection. **4.8★ / 62k ratings** ([App Store](https://apps.apple.com/us/app/birdbuddy-id-collect-birds/id1622355240)); $31–37M raised ([Tracxn](https://tracxn.com/d/companies/bird-buddy/__xGhNzg1FlB9VDgv2UjxGmtBU47jUXCBsolwxBYfDowE)). Proves collection mechanic at scale, but passive (no "go outside").

### 10. Biome 🇯🇵 (Kyoto), the proven at-scale template
Gamified citizen science: points, levels, rare/endangered/invasive bonuses, quest events. 840k downloads by Sep 2023, 6.5M+ records ([eLife 2024](https://elifesciences.org/articles/93694)). CNN + geospatial priors, ~100k species, >95% accuracy birds/mammals, <90% plants/fish. Feeds municipal surveys. Japan-only. **Closest evidence that a gamified dex can produce scientifically usable data.**

## 🟡 Smaller / early / niche
| App | Note | Source |
|---|---|---|
| NatureDex (Co AI Inc.) | Apple ecosystem; AI ID, field notes, badges, leaderboards; 4 ratings | [App Store](https://apps.apple.com/us/app/naturedex/id6748327779) |
| AnimalDex | 1,000+ species binders, AI arena battles; Pro $9.99; no ratings | [App Store](https://apps.apple.com/us/app/animaldex/id6761607780) |
| Snapfari | 164 species, photo-quality grades Bronze→Diamond w/ XP multipliers, anti-cheat | [snapfari.app](https://snapfari.app/) |
| ForestForay Naturalist + Kids | XP, ranks, "Bio-Dex" sticker album, fuzzed GPS for kids, toxicity warnings | [forestforay.com](https://forestforay.com/) |
| Wilder (Vermont) | Kids, **web app**, private beta; ranks, scavenger lists, daily quests; schools $29/student/yr | [app.wilderapp.com](https://app.wilderapp.com/) |
| WilderDEX! | TestFlight beta; "LIFE-CUBES" (1/day), trading | [Apple forum](https://developer.apple.com/forums/thread/819545) |
| Animadex, Wildgram, CatchCat, Pesdex, Wildest, Chirpie | dormant / unmaintained / niche | [dobudex](https://dobudex.com/best-real-life-pokedex-apps) |

**Naturblick** (MfN Berlin): ~120k users, free, open-source, BirdNET + Pl@ntNet ID, field book, no gamification ([App Store DE](https://apps.apple.com/de/app/naturblick/id1206911194)).

## ⚫ Dead / abandoned (cautionary tales)
| Project | Span | Lesson |
|---|---|---|
| NatureLynx (ABMI, Alberta) | 2018 → 2022 | ~21.5k records in 4 years; told users to use iNat. Regional institutional app can't out-compete iNat on data ([ABMI](https://archive.abmi.ca/home/news-events/news/Sunsetting-NatureLynx.html?mode=detail&scroll=&page=2)) |
| PocketPals (UK students) | 2017 → ~2019 | Virtual creatures ≠ nature connection ([Discover Wildlife](https://www.discoverwildlife.com/news/pokemon-go-inspires-new-wildlife-app)) |
| Wildeverse (Internet of Elephants) | 2020 → ? | Grant-funded AR narrative games don't retain ([TechCrunch](https://techcrunch.com/2020/04/05/internet-of-elephants-launches-wildeverse-an-ar-game-about-endangered-animals-and-conservation/)) |
| Naturedex (Toronto, printed checklist) | 2023 | Validates demand; nobody shipped it ([Weather Network](https://www.theweathernetwork.com/en/news/nature/outdoors/ontario-woman-creates-pokemon-go-like-game-to-get-people-outdoors-naturedex)) |
| Seek | 2018 → maintenance Apr 2025 | The vacuum the 2026 wave fills |
| Peridot (Niantic) | 2023 → 2026-08-31 | AR pets shut down after 3 years ([Wikipedia](https://en.wikipedia.org/wiki/Peridot_(franchise))) |

Niantic / Pokémon GO: no real-nature tie-in. Sustainability Week 2026 is purely in-game.

## 📊 Cross-cutting patterns
| Pattern | Evidence |
|---|---|
| Server-side AI ⇒ per-scan cost ⇒ caps / ~$3/mo subs | dobudex, Snappit, Wildcard Dex, Animalis, Wilder |
| Nobody does web + mobile hybrid | only Wilder (web-only beta), NatureDex (Apple only) |
| Nobody exports to GBIF / iNat / open data | all 10 dex games. Only Naturblick/Biome feed science |
| Universal weaknesses | misID, screenshot cheating, no fix/delete for wrong IDs, no offline, location privacy |
| Safety backlash is real | HN on Wildex; Birdex nesting-season criticism |
| AI art in cards is a landmine | Birdex's only major press criticism |
| Academic tailwind | *Biological Conservation* 2025 proposes Pokémon-style incentives ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0006320725000382)) |
| Kids segment crowded; adult "serious-but-fun" nearly empty | only Birdex (birds, UK) + tiny solo dex games |

## ⚠️ Caveats
- App Store "last updated" dates lack the year; Gotcha/AnimalDex are 2026 launches per press.
- Android download figures other than Birdex unverified.
- Not verified: Flora Incognita, iRecord, Zooniverse, Haikubox, BirdWeather, QuestaGame status.
