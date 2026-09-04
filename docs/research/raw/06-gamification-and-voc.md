# 🎮 Raw: Gamification lessons & voice of customer (researched 2026-09-04)

> Raw sub-agent output, lightly trimmed. Reddit blocked entirely; HN rate-limited; Google Play not fetched. Frequency estimates are judgment calls. All quotes verbatim from fetched pages.

## A1 — Gamification in nature / citizen science: works vs backfires
| Mechanic | ✅ Works | ❌ Backfires | Evidence |
|---|---|---|---|
| Global / all-time leaderboards | Motivates a small top tier | Volume over accuracy, discourages late joiners, alienates casuals. iNat staff: "It provides a lot of incentives for bad behavior…and can reduce data quality—sometimes significantly." | [forum](https://forum.inaturalist.org/t/option-to-remove-leaderboards-from-projects/11778), [forum](https://forum.inaturalist.org/t/leading-the-leaderboard-of-certain-species/42798) |
| Badges on the science platform | — | iNat formally refuses ("not currently accepting new feature requests related to: Gamification features"). Badges quarantined in Seek. Fear: "rewards for identifying would lead to people adding ID's … just to farm rewards" | [forum](https://forum.inaturalist.org/t/should-there-be-more-reward-mechanisms-for-identifiers/62889) |
| Time-boxed competitions (City Nature Challenge) | Huge one-off participation spikes | Floods identifiers, **no retention**: "many people with a high number of observations made during the CNC … then didn't make any observations at all during the rest of the year". Only 1 of 130 cities with 1,000 species had >80% Research Grade. "He who dies with the most iNat posts wins" | [CNC has a problem](https://forum.inaturalist.org/t/cnc-has-a-problem-and-we-need-to-fix-it/78169), [CNC 2026](https://forum.inaturalist.org/t/city-nature-challenge-2026/77622?page=10) |
| Rarity-weighted points (Biome, QuestaGame) | Drives uniform coverage; Biome >95% accuracy birds/mammals | Rare species identified *worse* (95% vs 87%), plants/fish <90%, many non-wild records; needed post-hoc filters + certified-user review | [eLife 2024](https://elifesciences.org/articles/93694) |
| Personal / self-set goals | Strong intrinsic pull: "I get excited when I find new species I haven't seen before (kinda like encountering a new pokémon)"; "This is me competing with me" | Volume goals still stress identifiers | [How much do you gamify iNat?](https://forum.inaturalist.org/t/how-much-do-you-gamify-inaturalist/55549) |
| AI-first ID as reward | Instant feedback; kids love it | Blind trust pollutes data: Merlin Sound ID padding eBird lists. "It should be used as a tool, not as the Ten Commandments etched in stone." | [Tweeters](https://mailman1.u.washington.edu/pipermail/tweeters/2024-April/004894.html) |
| Scores in classification games (Zooniverse) | De-incentivizes poor classifiers | "the best classifiers leaving"; volunteers "alienated by the addition of game-like scores" (Eveleigh 2013) | [Ponti et al.](https://www.researchgate.net/publication/322668986_Getting_it_Right_or_Being_Top_Rank_Games_in_Citizen_Science) |

**Academic sources:**
1. Di Cecco et al. 2021, *BioScience*: 31M iNat obs; **median user makes 3 observations on 3 days/yr**; top 1% contribute ~62%; weekend +37%. Retention, not acquisition, is the problem. [oup](https://academic.oup.com/bioscience/article/71/11/1179/6363083)
2. Atsumi et al. 2024, *eLife*: Biome app quality trade-offs. [elifesciences](https://elifesciences.org/articles/93694)
3. Kc & Sapkota 2025, *Biological Conservation*: "Can gamification save the planet?" (advocacy). [sciencedirect](https://www.sciencedirect.com/science/article/abs/pii/S0006320725000382)
4. *Biological Conservation* 2023, participant motivations: "little support that gamification increased participant motivation" (paywalled). [sciencedirect](https://www.sciencedirect.com/science/article/pii/S0006320723001805)
5. Bruch et al. 2023, ISPRS: Open Badges on openSenseMap, preliminary. [copernicus](https://isprs-archives.copernicus.org/articles/XLVIII-4-W7-2023/11/2023/)
6. Dorward et al. 2017, *Conservation Letters*: Pokémon Go and conservation. [wiley](https://conbio.onlinelibrary.wiley.com/doi/10.1111/conl.12326)
7. Ponti et al. 2018: competition vs accuracy in CS games.

**Skeptical read:** biodiversity-specific evidence is consistently *"engagement up, quality down unless you add expensive verification."*

## A2 — Mechanics to steal from non-nature analogues
| App | Mechanic | Transfers? |
|---|---|---|
| Pokémon GO | Silhouette grid for unseen; location-gated spawns; community days | ✅ Silhouette dex of *locally plausible* species is the core loop. ⚠️ Location herding trampled protected dunes ([DNAinfo](https://www.dnainfo.com/chicago/20160808/rogers-park/after-pokemon-go-players-trample-protected-north-side-dunes-city-steps/)). Never spawn hotspots on real rare-species coordinates. |
| Pikmin Bloom | Steps grow flowers; daily lifelog/postcards; "walking buddy" | ✅ "adds just the right amount of reward to a walk without distracting from the actual activity" ([Engadget](https://www.engadget.com/pikmin-bloom-has-been-helping-me-meet-my-outdoor-walking-goals-for-years-000025214.html)). Model for a daily "what did I notice" log. |
| Duolingo | Streaks, freeze, wager (+14% D7) | ⚠️ Nature is seasonal/weather-bound; daily streaks punish reality. Steal *streak freeze* + weekly cadence. Duolingo: "Learners who binge…were much more likely to abandon" ([blog](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)). |
| Strava | Segments = thousands of tiny local leaderboards; kudos; clubs | ✅ Compete on *your park's* list, not globally ([trophy.so](https://trophy.so/blog/how-strava-uses-segmented-leaderboards-to-drive-engagement)). Rank by diversity/quality, never raw count. |
| Geocaching | Hidden targets, found-it logs, difficulty ratings | ⚠️ Structure transfers; placement rules ban caches near sensitive habitat ([guidelines](https://www.geocaching.com/play/guidelines)). Use *habitat types* as quests, not GPS pins. |
| Untappd | Check-in = collection; badge levels; **retroactive badges** | ✅ Retroactive badges for imported iNat/eBird history is a cheap onboarding win ([help](https://help.untappd.com/hc/en-us/articles/360034403691-How-to-Enable-Retroactive-Badges)). |
| Letterboxd | Personal diary first, social second; lists; year-in-review | ✅ Best template for "life list I actually enjoy looking at". |
| Marvel Snap | Collection level unlocks; visual card flourish | ⚠️ Collection-level UX yes; loot-box randomness no. |

## A3 — Ethics checklist
- [ ] Auto-obscure sensitive taxa (threatened, poached herps, orchids, owls). Trade-off is real ([Science](https://www.science.org/content/article/conservation-app-s-censoring-observation-data-could-hurt-threatened-species-scientists)); "the biggest danger posed by use of iNaturalist is location theft resulting in poaching" ([forum](https://forum.inaturalist.org/t/danger-of-locations-on-inaturalist/6602)).
- [ ] No "go here to catch X" for real rare species ([Audubon](https://www.audubon.org/magazine/social-dilemma-whats-stake-when-we-propel-wild-birds-stardom); [eBird sensitive species](https://support.ebird.org/en/support/solutions/articles/48000803210-sensitive-species-in-ebird)).
- [ ] Strip EXIF GPS on shares; delay/coarsen public posting.
- [ ] No rarity multipliers on points (Biome evidence).
- [ ] Reward no-touch behaviours: stay on trail, no flash, no handling.
- [ ] Wild vs captive/cultivated prompt at capture.
- [ ] Safety disclaimers: "An app can make a lethal mistake much easier than a human" ([HN](https://news.ycombinator.com/item?id=22977328)). Never gamify fungi/foraging.
- [ ] Seasonal quest limits (nesting season, wildflower meadows).
- [ ] Kids: no accounts, no chat, no location sharing by default ([Bark](https://www.bark.us/app-reviews/apps/seek/), [Common Sense](https://www.commonsensemedia.org/app-reviews/seek-by-inaturalist)).

## B1 — Top recurring complaints
| # | Complaint | Apps | Freq | Quote + URL |
|---|---|---|---|---|
| 1 | Dark-pattern trial → $30–40/yr auto-renew, no refunds | PictureThis | Very high | "At every turn the app tries to trick you into subscribing" [App Store](https://apps.apple.com/app/1252497129); [Trustpilot 1.9/5](https://www.trustpilot.com/review/picturethisai.com) |
| 2 | Wrong / overconfident AI IDs | Seek, Merlin, PictureThis, PlantNet | Very high | "confusing a pheasant for a siamese fighting fish, a cougar for a dromedary camel" [Seek reviews](https://apps.apple.com/us/app/seek-by-inaturalist/id1353224144?see-all=reviews) |
| 3 | Observations never get a human ID (9 observers : 1 identifier) | iNaturalist | High | [forum](https://forum.inaturalist.org/t/should-there-be-more-reward-mechanisms-for-identifiers/62889) |
| 4 | **Data loss / no backup / no sync** | Seek, Merlin | High | "no way for users to back up their data, so when I got a new phone I lost all the hundreds of observations." [Seek reviews](https://apps.apple.com/us/app/seek-by-inaturalist/id1353224144?see-all=reviews) |
| 5 | Camera needs 5–6 shots, clutters roll | Seek | High | "I often have to take five or six pictures of a single thing to get recognition" |
| 6 | Confusing new-app GUI | iNaturalist | High 2025–26 | "The new app GUI is confusing, poorly laid out" [App Store](https://apps.apple.com/us/app/inaturalist/id6475737561) |
| 7 | Poor offline behaviour | iNaturalist, Merlin | Med-high | [forum category](https://forum.inaturalist.org/c/inaturalist-next-discussion/34) |
| 8 | **Shallow species info (Wikipedia stub)** | Seek, PictureThis | Medium | "just the very beginning of a wiki page"; profiles "lack clickable links" ([Common Sense](https://www.commonsensemedia.org/app-reviews/seek-by-inaturalist)) |
| 9 | Life list clunky; logging a known bird forces the quiz | Merlin | Medium | [justuseapp](https://justuseapp.com/en/app/773457673/merlin-bird-id-by-cornell-lab/reviews) |
| 10 | Sound-ID regressions after updates | Merlin | Medium | [Product Hunt](https://www.producthunt.com/products/merlin-bird-id-2/reviews) |
| 11 | **Challenges stopped / arrive late** | Seek | Medium | "The app has stopped doing challenges—the challenges were a very fun excuse to get outside" |
| 12 | Competitions flood platform, users vanish | iNat / CNC | Medium | "those who could assist new users are already overwhelmed by artificial deadlines" |
| 13 | No danger/toxicity warnings | Seek | Low-med | "never tells you if something is dangerous, toxic" |
| 14 | Taxonomy learning curve | iNaturalist | Medium | "iNaturalist doesn't have a steep learning curve, taxonomy has a steep learning curve." [forum](https://forum.inaturalist.org/t/engaging-with-nature-and-the-slippery-slope-of-quality/51628) |
| 15 | AI-partnership trust backlash | iNaturalist | Low but vocal | [App Store](https://apps.apple.com/us/app/inaturalist/id6475737561) |

## B2 — Top recurring wishes
| # | Wish | Where | Quote + URL |
|---|---|---|---|
| 1 | **Beautiful, browsable life list / tree-of-life with gaps shown** | iNat forum, open since 2019 | "the different branches of the tree that you have observed are lit up" [forum](https://forum.inaturalist.org/t/better-life-list-visualization/1555); [add unobserved species](https://forum.inaturalist.org/t/dynamic-life-list-add-unobserved-species-to-list-and-tree-view/59261) |
| 2 | Offline life list / regional species list | iNat forum | [forum](https://forum.inaturalist.org/t/create-offline-lifelist-of-your-observations/28740) |
| 3 | Cloud backup / device migration | Seek reviews | see B1 #4 |
| 4 | Filter life list to verified only | iNat forum 2026 | [forum](https://forum.inaturalist.org/t/create-a-way-for-life-list-to-only-have-rg-observations/76130) |
| 5 | Predictable, fresh challenges | Seek | "monthly challenges available by the first of the month" |
| 6 | Credit for observations IDed later by community | Seek → iNat | [justuseapp](https://justuseapp.com/en/app/1353224144/seek-by-inaturalist/reviews) |
| 7 | Quick-log a species you already know | Merlin | |
| 8 | In-app crop, multi-photo, copy location | iNat Next | |
| 9 | **Learn, not just get an answer**: deeper species pages, "why" for the ID | Seek, HN, Common Sense | |
| 10 | Sustained gentle year-round engagement instead of one spring sprint | iNat forum | "is it more important to produce more data or to produce more naturalists?" [CNC has a problem](https://forum.inaturalist.org/t/cnc-has-a-problem-and-we-need-to-fix-it/78169) |
| 11 | One fair price / one-time purchase | PictureThis | "Would pay one-time but never $30 yearly subscription" |
| 12 | Kid-safe by default but with family sharing | Parents | [Bark](https://www.bark.us/app-reviews/apps/seek/) |

## B3 — Insights for a new entrant
1. **Own the "Pokédex" layer; don't compete on the science layer.** Unmet slot: a personal collection UI *on top of* iNat/eBird/GBIF data; import via API, retroactive badges, sync back only on opt-in. Never re-create an identifier community you can't staff.
2. **Gamify quality and behaviour, not volume.** Score diversity, complete evidence, wild tagging, no-touch conduct, waiting for verified ID.
3. **Silhouettes for what's plausible here-and-now.** Pokémon GO's hook is the visible gap in the grid. Fill it with locally/seasonally likely species from occurrence data.
4. **Local, tiny leaderboards or none.** Toggle to hide competition entirely.
5. **Weekly rhythm with freezes, not daily streaks.**
6. **Offline-first + owned data.** Export/backup/device migration = oldest unfixed requests.
7. **Transparent pricing is a marketing weapon.**
8. **Ethics as product, not fine print.**

**Open questions:** (a) Reddit VoC not captured; (b) whether iNat API terms allow "collection layer on top" at scale; (c) QuestaGame status (answered in birding cluster: winding down).
