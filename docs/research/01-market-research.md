# 🧭 Market research & competitor analysis

**Project:** standkreis-dex, a gamified "Pokédex for nature" (flora + fauna), hybrid web + mobile.
**Date:** 2026-09-04 · **Scope:** global, curious casual adults, hobby/portfolio · **Status:** step 1 of 4, awaiting HITL review (step 2).

> Method: 8 parallel research passes (~600 web fetches) over app stores, forums, annual reports, peer-reviewed papers. Reddit and Google Play were largely bot-blocked; those voices are under-represented. Raw findings with all URLs live in [`raw/`](raw/). Numbers below are from sources dated 2025–2026 unless stated.

---

## ⚡ TL;DR

1. **The market has three tiers and a hole in the middle.** Science platforms refuse gamification on principle (iNaturalist, eBird, Pl@ntNet). Commercial ID utilities have zero gamification and hated pricing (PictureThis, Picture Insect, LeafSnap). And in 2026 a wave of ~10 solo-dev "dex games" rushed into the gap Seek left when it went into maintenance mode. **None combines fun + all taxa + learning + owned data + web.**
2. **The dex-game wave has demand but no proven retention.** All ten have under 600 ratings. The only breakout, Birdex (UK), is the one with **no AI at all**: honor-system logging, cards, quests. 200k sightings in weeks. The hook is the collection, not the camera.
3. **The ID engine is a commodity.** Pl@ntNet API is free to 500 IDs/day; BioCLIP 2 is MIT. iNaturalist's model is closed. Do not build or compete on identification accuracy.
4. **Gamification reliably backfires when it rewards volume.** Leaderboards degrade data quality (iNat staff, Biome study) and binge-competitions churn users (City Nature Challenge). Personal goals, silhouette gaps and gentle weekly rhythms are what people actually self-report loving.
5. **The real enemy is week three.** The median iNaturalist user makes 3 observations on 3 days a year. Seek users stall once badges hit gold. Retention design is the whole product.

---

## 🗺️ Landscape

| Tier | App | Taxa | Gamification | Social | Offline | Web | Own data / export | Price | Rating | One-line verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 🔬 **A · Science platforms** | iNaturalist | All | ❌ refused on principle | ✅ strong | ⚠️ weak | ✅ | ✅ API, CSV, GBIF | Free | 4.1★ (new app) | The data layer. Not a competitor, a substrate. |
| | Seek (iNat) | All | ✅ badges, levels, challenges | ❌ | ✅ on-device | ❌ | ❌ **no backup** | Free | 4.8★ iOS / 3.4★ Play | Closest incumbent. Stalled; no updates in 2026. |
| | eBird | Birds | Top 100, streak, prize draws | minimal | ✅ | ✅ | ✅ best in class | Free | 3.9★ | Listing culture, dated UX. |
| | Merlin | Birds | Life list only | ❌ | ✅ packs | ❌ | ❌ | Free | 4.9★ (112k) | Owns bird ID. Can't correct a wrong ID. |
| | Pl@ntNet | Plants | reputation only | light | ✅ | ✅ | ✅ GBIF, **free API** | Free | 4.6★ | Your plant ID backend. |
| | Observation.org / ObsIdentify | All (EU) | badges per group | ✅ | ❌ | ✅ | ✅ GBIF | Free | 3.7★ | Closest to "all-in-one", NL-centric, precise locations public. |
| 💳 **B · Commercial ID utilities** | PictureThis | Plants | ❌ | share only | ❌ | ❌ | ❌ | $39.99/yr, dark-pattern trial | 4.8★ (1.1M) | ~$65M+/yr. Proves willingness to pay; proves the anger too. |
| | Picture Insect | Insects | ❌ | ❌ | ❌ | ❌ | ❌ | $39.99/yr | 4.6★ | ~2% of PictureThis. Insects are a small market. |
| | LeafSnap (Appixi) | Plants | ❌ | ❌ | ❌ | ❌ | ❌ | ads + $29.99–39.99/yr | 4.5★ | Borrowed academic name. Unlimited free IDs with ads. |
| | Birda | Birds | badges, challenge leaderboards | ✅ feed | ✅ | ✅ | ✅ GBIF | $59.99/yr | 4.7★ | "The trust is gone" after moving free features behind paywall. |
| 🎴 **C · Dex games (2026 wave)** | Birdex (UK) | Birds | cards, XP, quests, bingo, streaks | Discord | n/a | ❌ | ❌ | Free | ~16k Android | **No AI, most traction.** AI card art backlash. |
| | Gotcha | Animals | silhouette dex, rarity, quests | friends | ❌ | ❌ | ❌ | IAP | 4.6★ (124) | Camera cuts creature into a sticker. Fastest-growing. |
| | BioSnap | Animals (+dinosaurs) | card packs, ranger levels | ❌ | ❌ | ❌ | ❌ | IAP + $9.99 pass | 4.8★ (571) | Highest-rated dex game. Not a real-nature product. |
| | Wildex | All | holo cards, XP, leaderboards | ❌ | ❌ | ❌ | ❌ | ads | 4.7★ (6) | HN backlash: incentivises disturbing wildlife. |
| | Animalis, dobudex, Snappit, Wildcard Dex, NatureDex, Snapfari, Wilder… | mixed | cards, battles, trading | thin | ❌ | Wilder only | ❌ | ~€3/mo | <10 ratings each | Server-side AI ⇒ scan caps ⇒ paywalls. Several already stalling. |
| 🏛️ **D · DACH public-funded** | Flora Incognita | Plants | badges + levels | ❌ | ✅ | ❌ | ❌ no API | Free | 4.9★ | Best free plant AI. Loved. Plants only. |
| | BirdNET Live | Birds + 862 others (sound) | ❌ | ❌ | ✅ fully | ❌ | models NC-licensed | Free | 4.3★ | Sound ID is solved and free (non-commercial). |
| | Naturblick, naturgucker, NABU Vogelwelt, ArtenFinder RLP | mixed | none or raffles | some | some | some | GBIF (CC0!) | Free / freemium | 1.0★–3.5★ | Siloed, dated, or paywalled. Feature inspiration only. |

Full per-app detail: [raw/01](raw/01-dex-games.md) · [raw/03](raw/03-birding-cluster.md) · [raw/04](raw/04-plant-insect-cluster.md) · [raw/05](raw/05-inat-cluster.md) · [raw/07](raw/07-dach-eu-cluster.md).

### 📍 Positioning map

```mermaid
quadrantChart
    title Utility vs. play · single taxon vs. all taxa
    x-axis "Utility / science" --> "Play / collection"
    y-axis "Single taxon" --> "All taxa"
    quadrant-1 "The empty slot"
    quadrant-2 "Science platforms"
    quadrant-3 "Single-purpose tools"
    quadrant-4 "Dex games"
    iNaturalist: [0.15, 0.9]
    Observation.org: [0.2, 0.85]
    Pl@ntNet: [0.15, 0.3]
    PictureThis: [0.25, 0.25]
    Merlin: [0.2, 0.15]
    eBird: [0.4, 0.12]
    Flora Incognita: [0.3, 0.28]
    Birda: [0.6, 0.18]
    Birdex: [0.9, 0.2]
    Seek: [0.65, 0.8]
    Gotcha: [0.85, 0.55]
    BioSnap: [0.92, 0.5]
    Wildex: [0.88, 0.7]
    standkreis-dex?: [0.7, 0.92]
```

Top-right is nearly empty. Seek sat there and stopped moving. The dex games are all animals-first and lean toward pure play; nobody in the top-right also *teaches*.

---

## 🏆 What the leaders do well (steal list)

| From | Steal | Why it works |
|---|---|---|
| Seek | Live camera with a real-time taxon ladder ("Animal → Bird → Corvid → Carrion Crow") | Teaches taxonomy as a side-effect of pointing a phone |
| Seek | "Species nearby" list, on-device, account-free | Zero onboarding friction; kid-safe by design |
| Merlin | 3-question ID wizard as fallback when no photo | Works when the bird has flown |
| Merlin | Regional packs, offline photo ID | Nature has no signal |
| Birdex | Honor-system logging with photo *optional*; weekly bingo; daily quiz | Removes the camera as bottleneck; the collection is the game |
| Gotcha | Cut-out sticker of *your* photo fills the silhouette | Your dex looks like your walks, not stock photos |
| Pl@ntNet | Multi-photo ID with organ tagging (leaf / flower / bark) | Better accuracy, and it teaches what to look at |
| eBird | Effort-based sessions with GPS track and duration | Turns a walk into a unit of play (Strava for nature) |
| Birda | Import from eBird / iNaturalist / BirdTrack | Retroactive collection on day one (Untappd's retroactive badges) |
| Flora Incognita | Phenology hints, "flowering now" | Seasonality as content |
| Observation.org | Wild-only rule, expert validation queue, group challenges via QR | Quality guardrails that casuals never notice |
| Pikmin Bloom | Ambient progress from just walking; daily postcard | Reward without demanding attention |
| Letterboxd | Diary first, social second, lists, year-in-review | The life list people actually enjoy *looking at* |

---

## 🕳️ What everyone misses (ranked gaps)

| # | Gap | Evidence |
|---|---|---|
| 1 | **A beautiful, browsable life list / tree of life with gaps shown** | iNaturalist's most-upvoted feature request, open since 2019, still unbuilt. Seek users stall once badges hit gold. Merlin's life list is "clunky." |
| 2 | **"What can I plausibly find *here*, *this month*?"** as silhouettes | Pokémon GO's real hook is the visible gap in the grid. Data exists free in GBIF and iNaturalist species-count endpoints. Nobody renders it as a personal target list. |
| 3 | **Learning depth** | Seek: "just the very beginning of a wiki page." Common Sense Media: profiles "lack clickable links that could deepen learning." Users want the *why* behind an ID. |
| 4 | **Own your data: backup, export, device migration** | Seek's #1 complaint: new phone = hundreds of observations and all badges gone. No dex game exports anything. |
| 5 | **Web + mobile** | Only Wilder (web-only beta) and NatureDex (Apple-only). Everyone else is a phone silo. |
| 6 | **Fix or delete a wrong ID** | Merlin, Wildex, ObsIdentify all lack it. Merlin's team asks users to email them. |
| 7 | **Honest pricing** | PictureThis's trial-to-$39.99 pattern is the loudest anger in the category. Birda: "the trust is gone." |
| 8 | **Ethics as product, not fine print** | Wildex's Hacker News launch was dominated by "points incentivise approaching wildlife" and poaching-location risk. Birdex criticised for no nesting-season guidance. |
| 9 | **Android parity** | iNaturalist's new app has no Android release after two years. Seek: 4.8★ iOS vs 3.4★ Play. |
| 10 | **Sustained gentle rhythm instead of one spring sprint** | City Nature Challenge produces "a mountain of low quality observations" then users vanish. Seek's challenges "stopped." |

---

## ☠️ Anti-patterns (what reliably backfires)

| Don't | Because |
|---|---|
| Global leaderboards or raw-count scoring | iNat staff: "a lot of incentives for bad behavior … can reduce data quality, sometimes significantly." Strava-style tiny local boards or none. |
| Rarity multipliers on points | Biome (Japan) shows they pull effort toward exactly the species that get misidentified and disturbed. |
| Daily streaks | Nature is seasonal and weather-bound. Duolingo's own data: bingers churn. Weekly cadence with freezes. |
| Location-pinned quests for real species | Pokémon GO trampled protected dunes; § 44 BNatSchG makes publishing nest sites a legal risk. Quest on *habitats*, not coordinates. |
| Server-side AI on every scan without a plan | Every dex game ended up with scan caps and a €3/mo paywall within weeks. |
| AI-generated card art | Birdex's only major press criticism. Use the user's own photo or CC-licensed imagery with attribution. |
| Anything touching fungi edibility or toxicity | Best app scores 74% on real poisoning cases. "An app can make a lethal mistake much easier than a human." |
| Forcing the camera | Birdex (no camera) outperforms every AI dex game. Merlin users hate being quizzed on birds they already know. |
| Including captive / cultivated / dinosaurs | Biome had to retrofit a wild-only prompt. BioSnap's Megalodon makes it a toy. |

---

## ⚠️ Threats

| Threat | Severity for a hobby project | Note |
|---|---|---|
| iNaturalist ships the collection view themselves | 🟡 medium | Requested since 2019, still not built; staff explicitly deprioritise "gamification." They'd rather not. |
| Seek gets revived | 🟢 low | No 2026 updates; staff redirect users to the new iNat app. |
| A dex game breaks out | 🟡 medium | Ten are trying. Birdex has the best shot but is birds + UK only. A well-designed all-taxa version could still win on craft. |
| Glority (PictureThis, $173M ARR) adds gamification | 🟢 low | Their model is subscription utility; play would cannibalise the paywall. |
| ID API costs at scale | 🟡 medium | Pl@ntNet free tier is 500/day. Above ~50k IDs/month, self-hosting BioCLIP 2 wins. Irrelevant until you have users. |
| Licensing leaks (BirdNET NC, Xeno-canto NC, iNat NC photos) | 🔴 high if ever monetised | Decide "free forever" vs "paid someday" *before* choosing data sources. |
| You stop using it in week 3 | 🔴 **the real one** | You are user #1. If it doesn't survive your own autumn, nothing else matters. |

---

## 🎯 Implications for standkreis-dex, given your answers

| Your answer | What it means |
|---|---|
| **Curious casuals, you as user #1** | Benchmark against Seek, Merlin, Birdex, Gotcha. Not iNaturalist. Optimise for "I learned something and want to go out again", not for research-grade data. |
| **Global from day one** | Species data must be GBIF + Wikidata, not Rote Liste or FloraWeb. DACH apps are feature inspiration only. Regional silhouette lists come from GBIF/iNat occurrence facets per grid cell and month. |
| **No Standkreis link** | Nothing site-specific. Good. |
| **Hobby / portfolio** | iNaturalist's free-ness and Glority's war chest are irrelevant. Free forever is the honest default, which also keeps the NC-licensed sound and photo assets legally available. Revisit only if strangers start using it. |

**The wedge in one sentence:** *the personal collection layer that the science platforms refuse to build and the dex games are too shallow to build, sitting on free open data, on web and phone, that teaches you something every time you open it.*

---

## ❓ Questions to carry into the grill (step 3)

1. **Camera or not?** Birdex proves the collection works without AI. Is v1 "log what you saw" with optional photo and Pl@ntNet assist, or camera-first?
2. **What is the unit of play?** A single sighting (Gotcha), a walk/session (eBird, Strava), or a place you return to (patch list)? This decides the data model.
3. **What is the silhouette list?** "Species within 10 km observed this month on GBIF" is buildable in a weekend. Is that the dex, or is the dex "everything"?
4. **How much social, and when?** Everything social multiplies scope. Letterboxd's answer: diary first, social later.
5. **Import first?** Retroactive collection from an iNaturalist or eBird export is the cheapest possible "wow" on day one for anyone with history. Do you have history?
6. **What does week 3 look like?** Concretely: it's a rainy Tuesday in November. Why do you open the app?
7. **Free forever, or keep the door open?** Determines BirdNET, Xeno-canto, iNat photo licensing today.

---

## 📚 Raw research

| File | Covers |
|---|---|
| [raw/01-dex-games.md](raw/01-dex-games.md) | The 2026 dex-game wave, dead projects, cross-cutting patterns |
| [raw/02-market-and-feasibility.md](raw/02-market-and-feasibility.md) | Market size, user bases, business models, ID APIs, species data, stack options, store policy |
| [raw/03-birding-cluster.md](raw/03-birding-cluster.md) | Merlin, eBird, Birda, QuestaGame |
| [raw/04-plant-insect-cluster.md](raw/04-plant-insect-cluster.md) | PictureThis, Pl@ntNet, Picture Insect, LeafSnap |
| [raw/05-inat-cluster.md](raw/05-inat-cluster.md) | iNaturalist, Seek, Observation.org, Google Lens |
| [raw/06-gamification-and-voc.md](raw/06-gamification-and-voc.md) | What works / backfires, analogues, ethics, complaints, wishes |
| [raw/07-dach-eu-cluster.md](raw/07-dach-eu-cluster.md) | Flora Incognita, Naturblick, NABU, ArtenFinder, ornitho, AT/CH, open data, German law |

**Known blind spots:** Reddit voice-of-customer not captured (bot-blocked). Google Play download tiers unverified. "Seek maintenance mode" is a competitor's phrasing, corroborated by iNat forum ("no updates for Seek" in 2026 staff reports) but not an official statement.
