# 🌿 Raw: PictureThis · Pl@ntNet · Picture Insect · LeafSnap (researched 2026-09-04)

> Raw sub-agent output, lightly trimmed. Reddit blocked; Google Play too large to parse. Some review sources are competitor blogs (flagged).

## 1. PictureThis (Glority, Hangzhou)
- **Positioning:** "Instantly identify plants with a snap": mass-market plant ID + care + disease diagnosis. iOS/Android; web is content only.
- **ID tech:** proprietary CNN; claims 400k+ species, "98% accuracy"; 24/7 expert chat for Premium.
- **Pricing (US, Jul 2026):** Pro **$39.99/yr**, $3.99 / $7.99 short plans, Family $49.99. 7-day trial auto-converts ([Growli survey, competitor blog](https://www.getgrowli.app/blog/plant-app-prices-2026); [App Store](https://apps.apple.com/us/app/picturethis-plant-identifier/id1252497129)). Up from $29.99 in 2022.
- **Dark patterns:** free = a handful of IDs with ads + constant prompts; historically share-to-Facebook for credits; paywall on first launch, tiny X ([identifythis.app](https://identifythis.app/is-picture-this-app-free)).
- **Scale:** **4.8★ / 1.1M ratings**. Sensor Tower: iOS ~700k downloads / ~$5M per month; Android ~1M / ~$700k → **~$65–70M/yr**. Glority reported at **$173M ARR**, #20 among top-100 private Chinese AI companies ([Tech Buzz China 2025-10](https://techbuzzchina.substack.com/p/the-state-of-chinese-ai-apps-2025)). Glority also runs Picture Insect, Picture Mushroom, Picture Bird.
- **Core:** ID, disease diagnosis, care schedules, water reminders, light meter, toxic-plant warnings, weed ID, "My Garden" collection, expert consultation.
- **Gamification:** **none.** "My Garden" is a care utility, not a completion game. **Social:** share cards only. **Offline:** no. **Data:** closed.
- **Accuracy (peer-reviewed):** 94% species / 96% genus on 16 Midwest species, yet "five of eleven potentially toxic species were identified as edible by at least one application" ([Clin Tox 2023](https://pubmed.ncbi.nlm.nih.gov/37535032/)); **74%** on 25 real poisoning cases ([Tox Comms 2024](https://www.tandfonline.com/doi/full/10.1080/24734306.2024.2377523)).
- **Complaints:** trial → $39.99 auto-charge is "the single most common complaint"; cancellation maze; different IDs from different angles; weak on cultivars; 400+ ComplaintsBoard entries.

## 2. Pl@ntNet (CIRAD · Inria · INRAE · IRD)
- **Positioning:** citizen-science botanical observatory, "open and free to everyone". iOS, Android, **web**.
- **Pricing:** **free, no ads, no IAP.** Funded by consortium dues + donations; compute via GENCI grant.
- **Scale:** tens of millions of users, 100k–700k DAU, peaks 1.5M IDs/day, >1B IDs total, 50+ languages; 84,710 species, 1.475B images, 77 floras ([plantnet.org](https://plantnet.org/en/)). US App Store 4.6★ / 7k (EU-centric base).
- **API:** 100M IDs, 1,800+ active accounts. **Free 500 IDs/day; Pro €1,000/yr min, €0.005 → €0.002/ID; non-profit free w/ logo** ([pricing](https://my.plantnet.org/pricing)). Gardenly already builds on it.
- **Data openness:** GBIF publisher, CC BY 4.0: 2.59M validated + 12.14M auto-ID occurrences; 1,300+ papers; code on GitHub; groups can export.
- **Core:** multi-photo ID with organ tagging, geo-tagged observations, floras/regional projects, GeoPl@ntNet species lists for an area, community voting, **groups** (public/private, geofence, export). No care/disease.
- **Offline:** yes, downloadable compressed model since Oct 2022.
- **Gamification:** almost none by design; reputation weight only ([users ranking](https://docs.plantnet.org/en/understand/users-ranking/)). 2026 "Pl@ntNet Watchers" = recognition status for error-correctors.
- **Accuracy:** 72% on Queensland poisoning cases.
- **Complaints:** no side-by-side comparison of your photo vs candidates; redesign removed "My Plants"; "always" location; North American gaps (poison ivy); no cultivar/houseplant content.

## 3. Picture Insect (Glority / "Next Vision Limited")
- **Positioning:** bug identifier + bite guide + pest control. iOS/Android. Claims 4,000+ species; entomologist Q&A for Premium.
- **Pricing:** $5.99/mo, $14.99/qtr, **$39.99/yr**, 7-day trial. Free: limited, watermarks, ads.
- **Scale:** 4.6★ / 44k ratings; Sensor Tower ~$1.2M/yr → ~2% of PictureThis. **Insect ID is a much smaller market.**
- **Gamification:** none beyond passive collection. **Social:** share cards. **Offline:** no. **Data:** closed.
- **Complaints:** upgrade pop-up every launch; "tricked 2 times into purchasing"; can't control which region of the photo is analysed; "was free, now subscription".

## 4. LeafSnap: two different things
- **4a. Original Leafsnap (Columbia · U Maryland · Smithsonian, 2011):** first visual-search plant ID app, leaf-outline matching, NE-US trees. **Defunct** ("website and iOS app are unavailable", [AlternativeTo 2023](https://alternativeto.net/software/leafsnap/about/)). Domain still shows "© 2025 LeafSnap" with no operator.
- **4b. "Plant Identifier: LeafSnap" (APPIXI, Hong Kong):** no relation beyond the borrowed name. Claims "400,000+ species, 98%" (identical to PictureThis marketing) but site says 32,000 taxa. Premium $4.99/mo … $29.99/yr; separate Pro $5.99/**week** / $39.99/yr; contains ads. **Free tier: unlimited basic IDs with ads** (genuine differentiator). 4.5★ / 4.9k ratings. Gamification/social/offline/open data: none of the four. Complaints: misleading ads, trial → year charge, photo gallery paywalled, accuracy regressions, crashes.

## Cross-cutting
| Dimension | PictureThis | Pl@ntNet | Picture Insect | LeafSnap (Appixi) |
|---|---|---|---|---|
| Price | $39.99/yr, auto-trial | Free, no ads | $39.99/yr, trial | $29.99–39.99/yr + $5.99/wk, ads |
| Scale | ~$65M+/yr, 1.1M ratings | tens of M users, 1B+ IDs | ~$1.2M/yr, 44k ratings | 4.9k ratings |
| Gamification | none | reputation only | none | none |
| Collection | "My Garden" (care) | observations + groups | album | journal |
| Offline | no | yes | no | no |
| Open data / API | closed | GBIF CC BY, API free ≤500/day | closed | closed |
| Fauna | no | no | insects only | insects add-on |

- **Nobody in this set gamifies.**
- **Trust gap is the marketing wedge:** the dominant complaint across all three commercial apps is the auto-renewing trial / cancellation maze, not accuracy.
- **Pl@ntNet API is a viable ID backend** and lets an app contribute to GBIF.
- **Accuracy ceiling is real:** even the best app is ~74% on real poisoning cases. Never imply edibility/toxicity certainty.
