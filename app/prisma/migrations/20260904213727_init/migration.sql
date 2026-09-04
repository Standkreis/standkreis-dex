-- CreateEnum
CREATE TYPE "Group" AS ENUM ('bird', 'mammal', 'insect', 'plant', 'fungus', 'amphibian', 'reptile');

-- CreateEnum
CREATE TYPE "InteractionKind" AS ENUM ('eats', 'eatenBy', 'pollinates', 'hostOf', 'parasiteOf', 'visitsFlowersOf');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('image', 'sound');

-- CreateEnum
CREATE TYPE "Evidence" AS ENUM ('claimed', 'photographed', 'idAssisted');

-- CreateEnum
CREATE TYPE "Wildness" AS ENUM ('wild', 'captive', 'cultivated');

-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credential" TEXT,
    "displayName" TEXT,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filter" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "region" JSONB,
    "regionName" TEXT,
    "groups" "Group"[],
    "wholeYear" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Taxon" (
    "id" TEXT NOT NULL,
    "gbifKey" INTEGER NOT NULL,
    "wikidataId" TEXT,
    "sciName" TEXT NOT NULL,
    "commonNames" JSONB NOT NULL DEFAULT '{}',
    "rank" TEXT NOT NULL,
    "group" "Group" NOT NULL,
    "iucn" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "intro" JSONB,
    "facts" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Taxon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plausibility" (
    "id" TEXT NOT NULL,
    "taxonId" TEXT NOT NULL,
    "cell" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "obsCount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "Plausibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "kind" "InteractionKind" NOT NULL,
    "origin" TEXT NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL DEFAULT 'image',
    "url" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "licence" TEXT NOT NULL,
    "licenceUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taxonId" TEXT,
    "sightingId" TEXT,
    "ownerId" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sighting" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "taxonId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "place" TEXT,
    "note" TEXT,
    "evidence" "Evidence" NOT NULL DEFAULT 'claimed',
    "wildness" "Wildness" NOT NULL DEFAULT 'wild',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sighting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "taxonId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recapPassed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Identity_credential_key" ON "Identity"("credential");

-- CreateIndex
CREATE UNIQUE INDEX "Filter_identityId_key" ON "Filter"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "Taxon_gbifKey_key" ON "Taxon"("gbifKey");

-- CreateIndex
CREATE UNIQUE INDEX "Taxon_wikidataId_key" ON "Taxon"("wikidataId");

-- CreateIndex
CREATE INDEX "Plausibility_cell_month_idx" ON "Plausibility"("cell", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Plausibility_taxonId_cell_month_source_key" ON "Plausibility"("taxonId", "cell", "month", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Interaction_sourceId_targetId_kind_key" ON "Interaction"("sourceId", "targetId", "kind");

-- CreateIndex
CREATE INDEX "Asset_taxonId_idx" ON "Asset"("taxonId");

-- CreateIndex
CREATE INDEX "Sighting_identityId_at_idx" ON "Sighting"("identityId", "at");

-- CreateIndex
CREATE INDEX "Sighting_identityId_taxonId_idx" ON "Sighting"("identityId", "taxonId");

-- CreateIndex
CREATE UNIQUE INDEX "Study_identityId_taxonId_key" ON "Study"("identityId", "taxonId");

-- AddForeignKey
ALTER TABLE "Filter" ADD CONSTRAINT "Filter_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plausibility" ADD CONSTRAINT "Plausibility_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_sightingId_fkey" FOREIGN KEY ("sightingId") REFERENCES "Sighting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sighting" ADD CONSTRAINT "Sighting_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sighting" ADD CONSTRAINT "Sighting_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
