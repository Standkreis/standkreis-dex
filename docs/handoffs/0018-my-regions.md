# 🗺️ [0018] Handoff — my regions: several at once, one active, switched in place

> A handoff, not a spec. Owner 2026-09-06: *"changing the region on my profile takes me to the onboarding, it should be changeable independently. Shouldn't I be able to add multiple regions at the same time, also a region in another country I want to travel to?"* Read the documents in §⬆️ before anything else.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-06 | Sven Reiser | [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🏗️ the global filter · [Record 0002](../records/0002-etl-the-plausible-set.md) (one region = one GADM unit) · [Findings 0014](0014-ui-second-pass-findings.md) 🅲 P2 | 1 agent session on `main`, before the Schagen trip on Wednesday |

## 🎯 Why

Three regions are live. The identity still holds exactly one, and changing it means the onboarding again. The model already carries several: one `Taxon` row per species, membership per region. What is missing is a list on the identity and a switch that is one tap away.

## 🗳️ Decided by the owner

| Rule | |
| --- | --- |
| Several regions on one identity, **one active** | The grid, the counters, the "nur jetzt" chip, the scan's set: all of the active region. A union grid is a database, not a walk |
| Switching is in place | A **"Meine Regionen" sheet** (0014b `Sheet`) from the profile and from the atlas header; the onboarding link goes |
| Only ready regions | The list is `dex.regions` with `status = ready`. No new regions from the UI (the owner's rule stands) |
| Progress is per region | Studied and seen stay taxon-level (a species studied is studied everywhere); the counters count them against the active set |

## 🛠️ Rows

| # | Do | Not |
| --- | --- | --- |
| R1 | **Schema, one hand-written migration** `app/prisma/migrations/20260907000000_filter_regions/migration.sql`: `ALTER TABLE "Filter" ADD COLUMN "regionIds" TEXT[] NOT NULL DEFAULT '{}'`; `schema.prisma` gets `regionIds String[] @default([])` on `Filter`. `regionId` stays the **active** one. Backfill in the same migration: `UPDATE "Filter" SET "regionIds" = ARRAY["regionId"] WHERE "regionId" IS NOT NULL`. Apply locally with `npx prisma migrate deploy` only | `migrate dev`, `db push`, `reset`: never |
| R2 | `identity.setFilter` takes `regionIds: string[]` (≥ 1, all ready) and `regionId` ∈ `regionIds`; `me` returns both; `identity.setRegion({ regionId })` as the one-tap switch (must be in `regionIds`) | |
| R3 | **`RegionSheet.tsx`**: the ready regions as rows with name, `higher`, set size, this month's count; a checkbox per row (in my list), the active one marked with the sky radio (0014 G5); tapping a row that is in the list makes it active and closes; tapping the checkbox adds or removes (the active one cannot be removed, the last one cannot be removed). Strings de/en | no search, no map |
| R4 | Entry points: the profile's region row opens the sheet (replaces the `/onboarding?change=1` link); the atlas header's region name becomes a button with a small chevron opening the same sheet; the filter drawer's "Ändern" opens it too | the onboarding's change mode may stay in code, no link to it remains |
| R5 | Switching the active region: grid, counters, diary header "Mainz-Bingen" and the log search's "jetzt wahrscheinlich" list refetch; the persisted tRPC cache (`PERSISTED`) keys by `regionId` already, verify; offline the sheet shows the list from cache and the switch works for regions whose set is cached, the others say "erst online laden" | |
| R6 | First-run onboarding step 1 unchanged: pick one, it becomes `regionIds = [it]` | |

## 🧪 Checks

| # | Check | Pass |
| --- | --- | --- |
| C1 | Dev DB after `migrate deploy`: existing filter rows have `regionIds = [regionId]` | |
| C2 | Production build, headless Chrome: profile → sheet → add Schagen → tap it → atlas shows 902 möglich, diary header Schagen, log search list is Schagen's | shots in `0018-shots/` |
| C3 | Remove the active region: refused with a line; remove the last: refused | |
| C4 | Offline (CDP): sheet opens from cache, switch to a cached region works, an uncached one says so | |
| C5 | Scan after the switch (`sighting.identify` with the new `regionId`): "Nicht im Atlas von Schagen" names the right region | mock or one real call, ≤ 6 ¢ |
| C6 | `npm run check` green; migration applies on a copy of the dev DB with no data loss | |
| C7 | Simulator: the owner switches between the three | owner |

## ⬇️ Output

Findings `0018-my-regions-findings.md`; roadmap line under "What earlier milestones changed"; DEPLOY.md untouched (the migration runs in the Vercel build as every migration does).

## 🚫 Not in this handoff

New regions from the UI · a union grid · per-region tiles · the dev-to-Neon copy script (its own handoff) · moving sightings between regions.

## 👉 Start the session with

```
Read docs/handoffs/0018-my-regions.md and the documents it names in §⬆️.
R1–R6 on main, C1–C6, findings. Commit, do not push.
```
