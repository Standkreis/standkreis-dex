import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { db } from './db'

// User photos on disk (handoff 0008 Track A): `app/data/photos/<assetId>.jpg`, gitignored. A laptop answer; an object
// store or the device (M15) decides later. The file name IS the Asset id, so a row and its file always find each other.
export const PHOTO_DIR = process.env.PHOTO_DIR ?? join(process.cwd(), 'data', 'photos')
export const photoPath = (assetId: string) => join(PHOTO_DIR, `${assetId}.jpg`)
/** The URL a photo Asset carries: same-origin, served by GET /api/photo/<id>. The static export prefixes NEXT_PUBLIC_API_URL on the client. */
export const photoUrl = (assetId: string) => `/api/photo/${assetId}`

export async function writePhoto(assetId: string, bytes: Uint8Array) {
  await mkdir(PHOTO_DIR, { recursive: true })
  await writeFile(photoPath(assetId), bytes)
}

const rm = (assetId: string) => unlink(photoPath(assetId)).catch(() => undefined) // a missing file is already gone

/**
 * Remove the files of every user photo on the given sightings. Call it BEFORE deleting the rows: the Sighting cascade
 * drops the Asset rows, and the file names are the Asset ids. Track B's `journal.remove` calls this, `data.delete` calls
 * `deletePhotoFilesOfIdentity`. Returns the number of files addressed.
 */
export async function deletePhotoFiles(sightingIds: string[]): Promise<number> {
  if (!sightingIds.length) return 0
  const assets = await db.asset.findMany({ where: { origin: 'user', sightingId: { in: sightingIds } }, select: { id: true } })
  await Promise.all(assets.map((a) => rm(a.id)))
  return assets.length
}

/** Every file the identity owns, attached or not. Before `identity.delete`. */
export async function deletePhotoFilesOfIdentity(identityId: string): Promise<number> {
  const assets = await db.asset.findMany({ where: { origin: 'user', ownerId: identityId }, select: { id: true } })
  await Promise.all(assets.map((a) => rm(a.id)))
  return assets.length
}

/** One asset: file and row. The sighting's evidence falls back to `claimed` when it was its last photo. */
export async function deletePhoto(assetId: string) {
  const a = await db.asset.findUnique({ where: { id: assetId }, select: { id: true, sightingId: true } })
  if (!a) return
  await rm(a.id)
  await db.asset.delete({ where: { id: a.id } })
  if (a.sightingId) {
    const left = await db.asset.count({ where: { sightingId: a.sightingId, kind: 'image' } })
    if (!left) await db.sighting.update({ where: { id: a.sightingId }, data: { evidence: 'claimed' } })
  }
}
