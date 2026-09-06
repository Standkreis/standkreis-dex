-- Handoff 0014 Track C (P2): the profile photo, one user Asset per identity.
-- AlterTable
ALTER TABLE "Identity" ADD COLUMN     "avatarAssetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Identity_avatarAssetId_key" ON "Identity"("avatarAssetId");

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_avatarAssetId_fkey" FOREIGN KEY ("avatarAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
