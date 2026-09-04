# 🐦 Raw: Merlin · eBird · Birda · QuestaGame (researched 2026-09-04)

> Raw sub-agent output, lightly trimmed. Google Play, Crunchbase, PitchBook, BirdForum blocked fetches.

## 1. Merlin Bird ID (Cornell Lab)
- **Positioning:** free AI bird-ID "training wheels": photo, sound, or 3-question wizard; explicitly a "safe playground" for beginners ([Audubon 2023](https://www.audubon.org/magazine/merlin-magical-it-still-makes-mistakes)).
- **Platforms / price:** iOS + Android, free, no IAP; 4.9★ / 112K ratings ([App Store](https://apps.apple.com/us/app/merlin-bird-id-by-cornell-lab/id773457673)). No web app.
- **Scale:** 23M downloads since 2014; 2025: 16M installs, 9.6M new users, 11.6M Sound ID users, 1.36B sound detections ([eBird 2025 Year in Review](https://ebird.org/news/2025-year-in-review)).
- **Core:** Photo ID (10k+ species), Sound ID (2,066 species, live spectrogram), Bird ID wizard, Explore (regional species), Life List.
- **ID tech:** CNN on Macaulay Library (67M images by 2024). No community/expert layer.
- **Gamification:** *only* a Life List ("This is my bird!"). No badges, streaks, levels, leaderboards. 55M IDs saved to life lists in 2025 by 2.5M people (+50% YoY).
- **Merlin ↔ eBird:** one-way; Merlin saves stay private ([eBird support](https://support.ebird.org/en/support/solutions/articles/48001144489-saving-birds-identified-with-merlin)).
- **Social:** none. **Offline:** regional bird packs; Photo ID works offline; saving requires internet.
- **Data:** closed, no API, no export from Merlin itself.
- **Weaknesses:** false positives (Little Ringed Plover in Arkansas), 3-second windows fooled by mimics ([Audubon](https://www.audubon.org/magazine/merlin-magical-it-still-makes-mistakes)); **no in-app way to correct a wrong Sound ID** ([Tweeters 2025-06](https://mailman1.u.washington.edu/pipermail/tweeters/2025-June/007233.html)); recordings lost on reinstall.

## 2. eBird (Cornell Lab)
- **Positioning:** world's largest citizen-science bird database; effort-based checklists, listing tools as hook.
- **Platforms / price:** web + mobile, free. App Store **3.9★ / 809 ratings** ([App Store](https://apps.apple.com/us/app/ebird/id988799279)).
- **Scale:** 2.1B observations, 302M in 2025, 1.2M eBirders ever; Global Big Day 2025: 1.8M participants ([Year in Review](https://ebird.org/news/2025-year-in-review)).
- **Core:** complete checklists w/ counts, GPS tracks, offline entry, Explore hotspots, Targets, Alerts, auto life/year/county/yard/patch lists.
- **ID tech:** none built in; automated filters + ~3,000 volunteer regional reviewers.
- **Gamification:** **Top 100** leaderboards per region (species or checklists, year or life), opt-out ([help](https://support.ebird.org/en/support/solutions/articles/48000794682-my-ebird)); **checklist streak**; **Checklist-a-day** challenge (8,280 finishers 2024, Zeiss prizes); **eBirder of the Month** drawn randomly. No badges, XP, levels.
- **Social:** minimal. **Offline:** yes.
- **Data openness (best in class):** CSV export, eBird Basic Dataset, API, 500M+ records in GBIF ([GBIF](https://www.gbif.org/news/82357/ebird-update-pushes-records-in-gbif-over-500-million)).
- **Weaknesses:** steep learning curve, dated UI ([Birda review](https://birda.org/ebird-a-comprehensive-app-review/)); reviewer gatekeeping ("respected eBirders" fast-tracked, 2007 gull unreviewed 18 years, [Tweeters 2025-05](https://mailman1.u.washington.edu/pipermail/tweeters/2025-May/007178.html)); Top 100 "may encourage unseemly competitiveness"; mobile crashes; data bias to urban/weekend.

## 3. Birda (Chirp Birding Ltd, London)
- **Positioning:** "Birding made better": social, gamified, beginner-friendly logging + AI ID ([birda.org](https://birda.org/)).
- **Company:** founded 2017, ~$2.91M raised, 17 employees (PitchBook/Tracxn snippets, unverified). Apple "App of the Day" ~150 countries ([Wikipedia](https://en.wikipedia.org/wiki/Birda_(app))).
- **Users:** "1M+ registered birders, 190+ countries"; 4.7★ / 2.2K US ratings ([App Store](https://apps.apple.com/us/app/birda-bird-watching-birding/id1564130920)).
- **Platforms / pricing:** iOS, Android, **web** (app.birda.org). Freemium: **Birda+** since Mar 2024, $9.99/mo or $59.99/yr. Plus: unlimited private challenges, custom lists, goals, "where to find unlogged species".
- **Core:** sessions (timed walk, GPS per sighting), AI photo ID, species guide, auto life lists (home/patch/region/country), hotspot map, **import from eBird/BirdTrack/iNaturalist**, sensitive-species obscuring.
- **ID tech:** cloud AI + community ID via feed comments.
- **Gamification:** badges/achievements; challenges (monthly counts, Big Years, photo, "Days Wild") each with own leaderboard; private friend challenges (paid); Birda Global Big Year 2026 with Bird Watching magazine ([challenges](https://app.birda.org/birdwatching-challenges)). No streaks/XP/levels.
- **Social (strongest):** feed, nearby feed, photo posts, comments, follows.
- **Offline:** yes. **Data:** publishes to GBIF; no public API.
- **Weaknesses:** **paywall backlash**: "The trust is gone" after free features moved behind Birda+ (App Store GB 2024-05); auto-charged $50 with unclear cancel (Trustpilot 3.3★); bugs (session duration resets; rarities hard to add because species list is location-filtered); AI-generated ads criticised; double-logging burden for eBird users; thin educational depth → beginner churn ([Nibble 2026](https://nibble-app.com/blog/birda)).

## 4. QuestaGame (Earth Guardians, Australia)
- **Positioning:** outdoor RPG: photograph wild organisms, earn gold, expert-verified, feed biodiversity databases (2014, Canberra) ([questagame.com](https://questagame.com/)).
- **Status 2025–26: winding down.** FAQ: "We cannot guarantee continued support of QuestaGame"; recommends successor **Spirits of the Realms** (AR card collecting, beta, "insufficient ratings") ([FAQ](https://questagame.com/faq1)). 4.6★ / 86 ratings after 11 years ([App Store AU](https://apps.apple.com/au/app/questagame/id886141835)).
- **Model:** free; sells refined biodiversity data; crypto-ish "BioCultural Units" via Guardians of Earth ([GoE](https://www.guardiansofearth.io/apps)).
- **Scale:** 2M+ sightings (2019); no 2024–26 numbers.
- **ID tech:** deliberately human: **Bio-Expertise Engine**, double-blind peer review weighted by expertise, 14-day verification promise ([BEE guide](https://questagame.com/a-guide-to-the-bio-expertise-engine)).
- **Gamification:** gold, collections, weekly leaderboards, clans, quests, equipment shop, expertise levels; same species blocked within 1 km / 24 h.
- **Data:** shared to GBIF/ALA by default; seven new spider species from player data ([Wikipedia](https://en.wikipedia.org/wiki/Questagame)).
- **Weaknesses:** crashes, 14-day verification latency vs instant AI, tiny active base, roadmap uncertainty, crypto framing.

## At a glance
| | Merlin | eBird | Birda | QuestaGame |
|---|---|---|---|---|
| Scope | Birds | Birds | Birds | All taxa |
| ID | On-device AI (photo + sound) | None (→ Merlin) | Cloud AI + community | Human experts |
| Gamification | Life list only | Top 100, streak, prize challenges | Badges, challenge leaderboards, Big Year | Gold, quests, clans, leaderboards |
| Social | None | Minimal | Feed + community | Clans / Discord |
| Offline | Bird packs | Yes | Yes | No |
| Open data | Closed | EBD / API / GBIF | GBIF | GBIF / ALA |
| Price | Free | Free | Freemium $59.99/yr | Free (gold economy) |
| Rating | 4.9★ (112K) | 3.9★ (809) | 4.7★ (2.2K) | 4.6★ (86) |
| Momentum | 16M installs/yr | 302M obs/yr | Big Year 2026 | Deprecated |

**Unverified:** Merlin↔eBird bidirectional sync; Birda round history; QuestaGame 2020 crowdfund result.
