-- Handoff 0018 (R1): several regions on one identity, `regionId` stays the active one.
-- AlterTable
ALTER TABLE "Filter" ADD COLUMN     "regionIds" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: every existing filter's list is its one region.
UPDATE "Filter" SET "regionIds" = ARRAY["regionId"] WHERE "regionId" IS NOT NULL;
