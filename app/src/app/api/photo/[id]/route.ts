import { db } from '@/server/db'
import { readPhoto } from '@/server/photos'

// GET /api/photo/<assetId>: the bytes behind a user photo. The id is a v4 uuid nobody can guess, so the URL is the
// capability (the export lists these URLs and they must keep working from the file). The store is private: this route
// STREAMS the object (never a redirect, there is no public URL) and the worker caches the answer under this URL, so a
// photo seen once online stays on the phone. Costs one Blob read per first view per device (handoff 0011 Track A).
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!uuid.test(id)) return new Response('not found', { status: 404 })
  const asset = await db.asset.findFirst({ where: { id, origin: 'user' }, select: { id: true } })
  if (!asset) return new Response('not found', { status: 404 })
  const photo = await readPhoto(asset.id)
  if (!photo) return new Response('not found', { status: 404 })
  const headers = new Headers({ 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=31536000, immutable' })
  if (photo.size !== undefined) headers.set('content-length', String(photo.size))
  return new Response(photo.body, { headers })
}
