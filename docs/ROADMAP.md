# 🗺️ Roadmap — standkreis-dex

> One table, kept current. A milestone is done when its "done when" is true and its findings or record is in `docs/`. Grills (🔥) produce records and spec sections, not code.

| 🗓️ Updated | 👤 Owner | ➡️ Next |
| --- | --- | --- |
| 2026-09-06 | Sven Reiser | **M9 🚶 the first walk**: live at [atlas.standkreis.de](https://atlas.standkreis.de) with Mainz-Bingen; the owner walks, the frictions become handoff 0012. Known: onboarding search shows "One moment" forever on a server error; a sighting page is blank offline until opened online once. [DEPLOY.md](DEPLOY.md) |

## 📍 Milestones

| # | Milestone | Slice | Done when | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| M0 | 🔬 Grill | pre | [Record 0001](records/0001-standkreis-dex-the-first-walk.md), [spec 0001](specs/0001-standkreis-dex-the-first-walk.md) | — | ✅ 2026-09-04 |
| M1 | 🎨 UI spike + review | pre | Spec §🎨 chosen, [review 0003](handoffs/0003-ui-spike-review.md) closed | M0 | ✅ 2026-09-04 |
| M2 | 🏗️ Scaffold | 1 | Next.js PWA, tokens, tRPC, Prisma, i18n de/en, spike deleted ([findings 0004](handoffs/0004-scaffold-findings.md)) | M1 | ✅ 2026-09-04 |
| M3 | 🔥 ETL grill | 1 | Region unit, cut, month rule, image ladder, rank rule decided on real data ([record 0002](records/0002-etl-the-plausible-set.md), [findings 0005](handoffs/0005-etl-grill-findings.md)) | M1 | ✅ 2026-09-05 |
| M4 | 🗄️ ETL + plausible set | 1 | Spec §🗃️ runs: taxa, plausibility per region with twelve month shares, assets with licence, text, GloBI edges, look-alikes in Postgres. Mainz-Bingen's grid feels like Saturday to the owner | M3, M2 schema updated to the new ERD | ✅ 2026-09-05, [findings 0006](handoffs/0006-etl-and-identity-findings.md) |
| M5 | 🏠 Atlas grid + species page | 1 | Onboarding sets region and tiles, grid with search bar, filter drawer and "nur jetzt" chip, species page from four sources, honest empty states, mark studied | M2, M4 | ✅ 2026-09-05, [findings 0007](handoffs/0007-atlas-grid-and-species-findings.md) |
| M6 | 🔍 Log + fill | 1 | Chooser, backbone search, wild/captive save, fill sheet, Tagebuch by day, E13 for species outside the set, "Entdeckt" on the species page | M5 | ✅ 2026-09-05, [findings 0008](handoffs/0008-log-and-journal-findings.md) |
| M7 | 🔐 Identity + data | 1 | Anonymous id, passkey/email sync, export JSON, delete, Du with counters and settings | M2 | ✅ 2026-09-05, [findings 0006](handoffs/0006-etl-and-identity-findings.md) |
| M7b | ✉️ Email attach | 1 | Verify an address through **Resend** (EU region), magic link adopts the identity like a passkey does, second recovery path. Needs the production domain for DKIM and the passkey relying-party id | M7, domain | owner's call 2026-09-05: Resend |
| M8 | 📴 Offline | 1 | Atlas for the active filter opens with no network, sightings queue and sync | M5, M7 | ✅ 2026-09-05 ([findings 0009](handoffs/0009-offline-findings.md)) |
| M8b | 🚀 Deploy | 1 | The app on Vercel (`fra1`, Node 24) with Neon Postgres and Blob photos at `atlas.standkreis.de`, RP id the apex; the phone reaches the app from a field ([DEPLOY.md](DEPLOY.md)). The VM deploy of [handoff 0010](handoffs/0010-deploy.md) was proven, then removed (Hetzner refused the card; restore: `git checkout 113a630 -- deploy`) | M8, domain | ✅ 2026-09-06, [findings 0011](handoffs/0011-vercel-findings.md); C6 on the phone passed (photo persists, out-of-set content lands) |
| M9 | 🚶 The first walk | 1 | The owner uses it on one walk and opens it again the next day ([handoff 0012](handoffs/0012-first-walk.md): Track 0 fixes two known frictions, then the walk, then the triage) | M6, M8b | ✅ 2026-09-06, closed by the owner after a short walk; the next-morning rule waived. **The finding: without species recognition, logging on the path is guessing.** Pre-walk frictions: [0013](handoffs/0013-onboarding-second-pass-findings.md), [0014](handoffs/0014-ui-second-pass-findings.md) |
| M9b | 📇 Steckbrief | 1–2 | The species page teaches: **data** (Größe, Alter, Nachwuchs, Lebensraum, Zug, Status from keyed open sources: EOL TraitBank, IUCN API, Wikidata, AnAge), **voice** (Xeno-canto clip with recordist and licence on the row), **prose** (an LLM editor writes two or three paragraphs per species from Wikipedia, GloBI and the facts, every sentence cited, cached in the DB once per species). Grill first: sources, licences, cost per species, schema change for facts and prose. Owner 2026-09-06: "as of now it's boring, almost no info to actually learn" | M9, M4 | owner's call 2026-09-06: before quests |
| M10 | 🔥 Quest + recap grill | 2 | Generator rules, repeat avoidance, the two-question recap, XP curve | M9 | |
| M11 | 🧭 Quests + recap + XP | 2 | Three weekly quests, recap unlocks studied XP, Du with level, "kommt bald" replaced | M10, M9b (the recap asks about the Steckbrief) | |
| M12 | 📷 Snap-and-send | 2–3 | Pl@ntNet key, BioCLIP 2 host, taxon ladder prefilling the search. Grill first: engines compared on the owner's own photos against the region's set | M6 | ➡️ next (M9's finding, owner 2026-09-06) |
| M13 | 🃏 Share card | 3 | Render route, coarsened location, no XP on the card | M6 | |
| M14 | 📋 List + map views | when the grid is proven | Toggle already has its place; the 10 km cell lives on the map | M9 | |
| M15 | 📱 Capacitor wrap + stores | when a second user wants it | Camera, GPS, SQLite, haptics via plugins | M8 | |
| M16 | ✍️ LLM editor | folded into M9b | Ecology prose from the graph with citations; removes the CC BY-SA intro | M9b | |
| M17 | 🌐 Later grills | later | Sessions, places, friends, feed, BirdNET, iNat export, fish tile cut, image takedown path | M13 | |

## 🔗 Dependencies

```mermaid
flowchart LR
    M0[🔬 M0 Grill ✅] --> M1[🎨 M1 UI spike ✅]
    M1 --> M2[🏗️ M2 Scaffold ✅]
    M1 --> M3[🔥 M3 ETL grill ✅]
    M3 --> M4[🗄️ M4 ETL]
    M2 --> M5[🏠 M5 Grid + species]
    M4 --> M5
    M2 --> M7[🔐 M7 Identity]
    M7 --> M7b[✉️ M7b Email attach]
    M5 --> M6[🔍 M6 Log + fill]
    M5 --> M8[📴 M8 Offline]
    M7 --> M8
    M6 --> M9[🚶 M9 First walk]
    M8 --> M9
    M9 --> M10[🔥 M10 Quest grill]
    M10 --> M11[🧭 M11 Quests + XP]
    M4 -.-> M11
    M6 --> M12[📷 M12 Snap-and-send]
    M6 --> M13[🃏 M13 Share card]
    M9 --> M14[📋 M14 List + map]
    M8 --> M15[📱 M15 Capacitor]
    M4 --> M16[✍️ M16 LLM editor]
    M13 --> M17[🌐 M17 Later grills]
```

## 📝 What earlier milestones changed

| Grill | Changed for later milestones |
| --- | --- |
| M3 | No grid cells: the region is one GADM level-2 polygon, so M4 stores plausibility per region, not per cell. M2's Prisma schema needs `Region`, `Asset` licence fields, the 12 month shares and the 8-tile enum before M4 writes into it |
| M3 | Month is a sort and a chip, not a filter on the denominator: M5's filter drawer loses "Zeitraum" |
| M3 | Lebensraum leaves the Steckbrief; intro falls back de → en; species outside the set get content on first log (M6) |
| M1 | Studied earns XP only after the recap, so M11 owns the XP switch, not M5 |
| M5 | Only Mainz-Bingen and Kyoto are selectable; `dex.requestRegion` exists but is unreachable from the UI until the loop closes (owner). The map shows GBIF density, the 10 km cell waits for M6's own sightings. AnAge fact values are English; OSM tiles need a proxy before launch |
| M6 | The content kick for out-of-set species runs in-process from `taxon.ensure` and is lost on restart (rerun the ETL heals); photos live on disk under `app/data/photos/` behind a capability URL, so M8 owns the queue, a signed URL and the storage question; out-of-set finds fill their cell but do not count (owner decides) |
| M8b | The passkey RP id is the apex `standkreis.de` for good, the app itself serves from `atlas.standkreis.de` (`WEBAUTHN_ORIGIN`), the apex is kept for a landing page; the server refuses to start in production without `WEBAUTHN_SECRET`, `DATABASE_URL`, `PHOTO_DIR`, `WEBAUTHN_*`; OSM tiles go through `/api/tiles`. Vercel replaced the VM (Hetzner refused the card): Neon Postgres on Prod + Preview (dev keeps Docker on 5433), the ETL runs from the Mac over `DATABASE_URL_UNPOOLED`, migrations run only in Vercel's build command, the Docker/standalone path was deleted; photos in `/tmp` do not persist and the in-process jobs die with the function until 0011 lands |
| M8 | `Sighting.id` is minted on the phone and `sighting.create` is idempotent by id; queries persist in localStorage (IndexedDB wedged in the iOS Simulator), the outbox in IndexedDB; `dynamicParams = false` left the locale layout; the region job is still in-process, a restart sweep heals it, no job table; the offline image cache is ~27 MB per region, not 14; the export works from any file server |
| M7 | `Filter` and `Study` rows exist but have no mutation: M5 adds `identity.setFilter`, `study.mark`; the region job runs in-process from `dex.requestRegion` until M8 brings a queue |
