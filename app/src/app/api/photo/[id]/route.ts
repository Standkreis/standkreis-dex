import { readFile } from 'node:fs/promises'
import { db } from '@/server/db'
import { photoPath } from '@/server/photos'

// GET /api/photo/<assetId>: the file behind a user photo. The id is a v4 uuid nobody can guess, so the URL is the
// capability (the export lists these URLs and they must keep working from the file). Nothing else is served from disk.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!uuid.test(id)) return new Response('not found', { status: 404 })
  const asset = await db.asset.findFirst({ where: { id, origin: 'user' }, select: { id: true } })
  if (!asset) return new Response('not found', { status: 404 })
  try {
    const bytes = await readFile(photoPath(asset.id))
    return new Response(bytes, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=31536000, immutable' } })
  } catch {
    return new Response('not found', { status: 404 })
  }
}
