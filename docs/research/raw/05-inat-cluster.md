# 🌍 Raw: iNaturalist · Seek · Observation.org/ObsIdentify · Google Lens (researched 2026-09-04)

> Raw sub-agent output, lightly trimmed. iNat blog, observation.org, Reddit blocked fetches; facts relayed via Wikipedia, iNat forum, aggregators, Observation International annual report.

## 1. iNaturalist
- **Positioning:** nonprofit citizen-science network; explicitly *not* a game. Independent 501(c)(3) since Jul 2023 ([Wikipedia](https://en.wikipedia.org/wiki/INaturalist)).
- **Platforms:** web; new React Native app on iOS since Apr 2025 (old app = "iNaturalist Classic"); **Android still on legacy app**, closed beta of new app only since ~Jul 2026, "no timeline" ([iNat Next development, Aug 2026](https://forum.inaturalist.org/t/inat-next-development/83574)).
- **Model:** free, no ads/IAP. $10M Moore Foundation grant (2023, through 2030); $1.5M Google.org GenAI grant (Jun 2025) → community outcry ([SciAm](https://www.scientificamerican.com/article/google-ai-grant-to-inaturalist-prompts-community-outcry/)).
- **Scale:** 5.0M registered users (Dec 2025); 400k MAU (Aug 2025); live API today: 383.0M total / 348.5M verifiable obs ([API](https://api.inaturalist.org/v1/observations?per_page=0)); 4,000+ papers.
- **Core:** photo/sound obs, projects (missing in new app), Explore map, Identify mode (web), journals, Year-in-Review. New app: AI camera, "standard" vs "advanced" mode (auto-switch at ≥100 obs).
- **ID tech:** own CV + geomodel (monthly retrains, +1,300–1,500 taxa/release) → community ID → Research Grade at ⅔ agreement.
- **Gamification: deliberate avoidance (staff quotes):**
  - tiwane 2019: gamifying iNat "is not something the iNat team is particularly interested in"; Seek exists so gamification doesn't compromise iNat data ([forum](https://forum.inaturalist.org/t/create-personal-challenges-and-trophy-badge-system-to-make-inaturalist-appeal-to-general-audience/5238)).
  - tiwane Dec 2023: gamification "provides a lot of incentives for bad behavior … and can reduce data quality – sometimes significantly"; staff "hope that people see their encounters with non-human organisms as intrinsically special and not related to extrinsic rewards" ([long-term direction](https://forum.inaturalist.org/t/whats-the-long-term-direction-for-inat-seek-and-gamification/47546)).
  - Global identifier leaderboard removed ~2020; place-page leaderboards kept as "find the local expert" tools.
  - Users self-gamify anyway: streaks since 2020, 10k/year targets, "catch 'em all" ([How much do you gamify iNat](https://forum.inaturalist.org/t/how-much-do-you-gamify-inaturalist/55549)).
- **Social:** follow, comments, @mentions, messages, projects, journals, forum.
- **Offline:** new app has offline CV + queued uploads but "doesn't seem to work that well without cell service"; can't type species names offline.
- **Data openness:** public REST API (~60 req/min), CSV export, weekly GBIF export (165.1M records), default CC BY-NC, all apps MIT open source.
- **Weaknesses:** new-app backlash ("No way to make an observation without running the algorithm", loss of placeholders, projects removal "deal breaker", "way too many clicks", 4.1★ / 659 ratings, [App Store](https://apps.apple.com/us/app/inaturalist/id6475737561)); **Android neglect** ("Android accounts for 70% of smartphones"); ID backlog, only ~10% of users identify, identifier burnout; GenAI trust crisis (624-reply thread, [forum](https://forum.inaturalist.org/t/what-is-this-inaturalist-and-generative-ai/66140)).

## 2. Seek by iNaturalist
- **Positioning:** kid-safe, account-free, gamified on-device ID camera; staff: "Seek is designed to be an *alternative to* iNaturalist, not an adjunct to it" (Jul 2025, [feedback thread](https://forum.inaturalist.org/t/feedback-for-seek-by-inaturalist/67176)).
- **Platforms:** iOS + Android only (Mar 2018; React Native, MIT, [GitHub](https://github.com/inaturalist/SeekReactNative)). Free, no ads/IAP.
- **Scale:** ~7.5M+ iOS downloads; App Store 4.8★ (31k) vs **Google Play 3.4★ (10.5k)**. Only ~2% of iNat obs came via Seek (late 2021) → weak funnel.
- **Core:** live AR camera with real-time taxon ladder, photo-library ID, "species nearby" from iNat data, personal list, optional post to iNat, location obscured, no data collection.
- **ID tech:** fully on-device CV (~80–86k taxa since Mar 2025) + geo filter; no community ID. Staff: "We'd rather Seek be accurate at a higher taxonomic level than inaccurate at a finer one."
- **Gamification:** taxon badges bronze/silver/gold, observer levels, monthly/seasonal challenges. **Motivation stalls at gold**; requests for more badges/levels since 2019 unaddressed ([forum](https://forum.inaturalist.org/t/add-more-seek-badges-and-levels/7358); [long-time user review 2025](https://biomtcook.blogspot.com/2025/07/seek-by-inaturalist-review-long-time.html)).
- **Social:** none. **Offline:** yes, entire model on device.
- **Data:** stays on device, **no backup/export**.
- **Weaknesses:** accuracy ("doesn't recognize common flowers … anymore"); **data loss on phone change** incl. badges ([Kimola](https://kimola.com/reports/in-depth-seek-by-inaturalist-review-analysis-insights-feedback-google-play-en-140322)); broken iNat sync (multi-month hangs); **neglect**: "No updates" for Seek in most 2026 staff reports, staff redirect users to the new iNat app; auto-scan grabs wrong subject; no toxicity warnings.

## 3. Observation.org / ObsIdentify (NL)
- **Positioning:** Europe + Dutch Caribbean citizen-science platform (since 2004), Dutch ANBI foundation; ObsIdentify = low-threshold AI-ID app ([Wikipedia](https://en.wikipedia.org/wiki/Observation.org)).
- **Platforms:** web portals; ObsIdentify (iOS/Android); new "Observation" app (Jan 2025); legacy ObsMapp/iObs in maintenance.
- **Model:** free; partner orgs (Naturalis, Natuurpunt, NDFF…), Business Club, donations; 16 staff / 10 FTE ([Annual Report 2024](https://observation-international.org/files/obsint-annual-report-2024-en.pdf)).
- **Scale:** 314M observations, 584k users; 39.5M obs in 2024 (+20% YoY), 42% NL, 26% BE, **9% DE**; ObsIdentify on 1.5M+ phones; GBIF 135.1M occurrences, third-largest publisher.
- **Core (ObsIdentify):** one-tap photo ID (wild species only), auto-submits to Observation.org, personal list, groups, BioBlitz/challenges via QR (Apr 2025), tips to find new species.
- **ID tech:** NIA (Nature Identification API) by Naturalis, confidence %; human validators (~1,250 active) + AI auto-validation; ~62% validated; only validated → GBIF.
- **Gamification:** badges per species group (up to 5 stars), challenges, group leaderboards; aimed at "newcomers and, importantly, youngsters"; national treasure hunt "ObsZoek" 2024. Gamification is #2 praise theme in reviews ([MWM](https://mwm.ai/apps/obsidentify/1464543488)).
- **Social:** groups; web comments, validator feedback. Everything public by default.
- **Offline:** no (server round-trip). Account required.
- **Data openness:** GBIF (CC BY-NC dominant), Dutch NDFF; NIA API for partners; CSV export.
- **Weaknesses:** **weak ratings** (Play ≈3.7★, US App Store 2.0★ / 5); tedious login; **privacy**: precise time + position public for everyone (18 mentions); photo without GPS rejected; predominantly Dutch content; Europe-only; lookalike ambiguity ("59% vs 41%"); thin governance.

## 4. Google Lens (indirect)
- General visual search in Google app / Android camera / Photos / Chrome / Gemini; free. ~20B visual searches/month (Oct 2024), ~1.5B monthly users.
- Cloud CV + Gemini; no location filtering, no community, no confidence score, online-only.
- Accuracy: PLoS ONE 2023 (9 apps): Lens ≈ Seek on flowers; "none … achieved a highly consistent accuracy (e.g., over 90%)" ([Hart et al. 2023](https://besjournals.onlinelibrary.wiley.com/doi/full/10.1002/pan3.10460)).
- **Gaps:** no logging, no life list, no gamification, no contribution, no offline. Pure lookup.

## Cross-cutting
| Gap | Evidence |
|---|---|
| Gamified + social + open-data in one app doesn't exist | iNat refuses gamification; Seek has badges but no accounts/social/backup; ObsIdentify has badges but EU-only, no offline |
| Android underserved | iNat new app Android-less after 2 years; Seek 3.4★ on Play |
| Data-loss anxiety | Seek badge/observation loss on phone change is a top complaint |
| Trust & transparency | iNat's GenAI backlash: community punishes opaque AI moves |
| Gamification ↔ data quality | tiwane 2023: reward *quality/effort*, not raw counts |
