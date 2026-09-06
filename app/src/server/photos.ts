import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { del, get, put } from '@vercel/blob'
import { db } from './db'
import { env } from './env'

// User photos (handoff 0008 Track A, 0011 Track A). Two stores behind one seam, picked once at start:
//   BLOB_READ_WRITE_TOKEN set → Vercel Blob, private store, `photos/<assetId>.jpg` (Vercel: /tmp does not survive a request)
//   otherwise                → disk under PHOTO_DIR, `<assetId>.jpg` (dev, tests, the VM)
// The object's name IS the Asset id, so a row and its file always find each other and nothing new is stored in the DB.
// The URL a photo carries never changes (`/api/photo/<id>`): the outbox uploads to it, the worker caches it.
const BLOB_TOKEN = env.BLOB_READ_WRITE_TOKEN
export const photoStore: 'blob' | 'disk' = BLOB_TOKEN ? 'blob' : 'disk'
export const PHOTO_DIR = env.PHOTO_DIR ?? join(process.cwd(), 'data', 'photos')
export const photoPath = (assetId: string) => join(PHOTO_DIR, `${assetId}.jpg`)
export const blobPath = (assetId: string) => `photos/${assetId}.jpg`
/** The URL a photo Asset carries: same-origin, served by GET /api/photo/<id>. The static export prefixes NEXT_PUBLIC_API_URL on the client. */
export const photoUrl = (assetId: string) => `/api/photo/${assetId}`

export async function writePhoto(assetId: string, bytes: Uint8Array) {
  if (BLOB_TOKEN) {
    await put(blobPath(assetId), Buffer.from(bytes), { access: 'private', addRandomSuffix: false, contentType: 'image/jpeg', token: BLOB_TOKEN })
    return
  }
  await mkdir(PHOTO_DIR, { recursive: true })
  await writeFile(photoPath(assetId), bytes)
}

/** The bytes behind GET /api/photo/<id>: a stream from the private blob, or the file. `null` when the store has nothing. */
export async function readPhoto(assetId: string): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>; size?: number } | null> {
  if (BLOB_TOKEN) {
    const r = await get(blobPath(assetId), { access: 'private', token: BLOB_TOKEN }).catch(() => null)
    if (!r || r.statusCode !== 200) return null
    return { body: r.stream, size: r.blob.size }
  }
  try {
    const bytes = new Uint8Array(await readFile(photoPath(assetId))) // a copy into its own ArrayBuffer: what Response accepts
    return { body: bytes, size: bytes.length }
  } catch {
    return null
  }
}

// A missing object is already gone: neither store's miss is an error here.
const rm = (assetId: string) => (BLOB_TOKEN ? del(blobPath(assetId), { token: BLOB_TOKEN }) : unlink(photoPath(assetId))).catch(() => undefined)

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

/**
 * Abandoned uploads (findings 0008 A7): user Asset rows no sighting ever bound, older than `olderThanMs`, with their
 * files. The restart sweep calls this; a photo still waiting in a phone's outbox is not on the server yet, so nothing
 * a walker still needs can be here.
 */
export async function deleteAbandonedPhotos(olderThanMs = 24 * 3_600_000): Promise<number> {
  const assets = await db.asset.findMany({ where: { origin: 'user', sightingId: null, createdAt: { lt: new Date(Date.now() - olderThanMs) } }, select: { id: true } })
  if (!assets.length) return 0
  await Promise.all(assets.map((a) => rm(a.id)))
  await db.asset.deleteMany({ where: { id: { in: assets.map((a) => a.id) } } })
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
