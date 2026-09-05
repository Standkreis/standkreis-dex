-- CreateEnum
CREATE TYPE "Tile" AS ENUM ('bird', 'mammal', 'amphibian', 'reptile', 'fish', 'insect', 'plant', 'fungus');

-- CreateEnum
CREATE TYPE "RegionStatus" AS ENUM ('queued', 'ready', 'failed');

-- DropIndex
DROP INDEX "Identity_credential_key";

-- DropIndex
DROP INDEX "Plausibility_cell_month_idx";

-- DropIndex
DROP INDEX "Plausibility_taxonId_cell_month_source_key";

-- AlterTable
ALTER TABLE "Filter" DROP COLUMN "groups",
DROP COLUMN "region",
DROP COLUMN "regionName",
DROP COLUMN "wholeYear",
ADD COLUMN     "nowOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "regionId" TEXT,
ADD COLUMN     "tiles" "Tile"[];

-- AlterTable
ALTER TABLE "Identity" DROP COLUMN "credential",
ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "Plausibility" DROP COLUMN "cell",
DROP COLUMN "month",
DROP COLUMN "obsCount",
DROP COLUMN "source",
ADD COLUMN     "monthShare" INTEGER[],
ADD COLUMN     "obs" INTEGER NOT NULL,
ADD COLUMN     "peak" INTEGER NOT NULL,
ADD COLUMN     "regionId" TEXT NOT NULL,
ADD COLUMN     "words" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Taxon" DROP COLUMN "group",
ADD COLUMN     "class" TEXT,
ADD COLUMN     "contentAt" TIMESTAMP(3),
ADD COLUMN     "genus" TEXT,
ADD COLUMN     "namePath" TEXT,
ADD COLUMN     "order" TEXT,
ADD COLUMN     "tile" "Tile" NOT NULL;

-- DropEnum
DROP TYPE "Group";

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "gadmGid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "higher" TEXT NOT NULL,
    "monthTotals" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "status" "RegionStatus" NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "refreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lookalike" (
    "taxonId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "siblingId" TEXT NOT NULL,

    CONSTRAINT "Lookalike_pkey" PRIMARY KEY ("taxonId","regionId","siblingId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");

-- CreateIndex
CREATE INDEX "Passkey_identityId_idx" ON "Passkey"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_gadmGid_key" ON "Region"("gadmGid");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_email_key" ON "Identity"("email");

-- CreateIndex
CREATE INDEX "Plausibility_regionId_idx" ON "Plausibility"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Plausibility_taxonId_regionId_key" ON "Plausibility"("taxonId", "regionId");

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filter" ADD CONSTRAINT "Filter_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plausibility" ADD CONSTRAINT "Plausibility_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lookalike" ADD CONSTRAINT "Lookalike_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lookalike" ADD CONSTRAINT "Lookalike_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lookalike" ADD CONSTRAINT "Lookalike_siblingId_fkey" FOREIGN KEY ("siblingId") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
