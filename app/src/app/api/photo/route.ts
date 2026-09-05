import { createContext } from '@/server/trpc'
import { photoUrl, writePhoto } from '@/server/photos'

// POST /api/photo (handoff 0008 Track A): one multipart field `file`, a JPEG the client already resized and re-encoded
// through a canvas (no EXIF, no GPS). Stored under app/data/photos/<assetId>.jpg; the Asset row belongs to the identity
// (owner) and to no sighting yet: `sighting.create({photoId})` or `sighting.attachPhoto` binds it. Out of the static export.
const MAX = 8 * 1024 * 1024

export async function POST(req: Request) {
  const ctx = await createContext({ req })
  const headers = new Headers({ 'content-type': 'application/json' })
  for (const c of ctx.outCookies) headers.append('set-cookie', c)
  const bad = (message: string, status = 400) => new Response(JSON.stringify({ error: message }), { status, headers })
  let form: FormData
  try { form = await req.formData() } catch { return bad('multipart expected') }
  const file = form.get('file')
  if (!(file instanceof File)) return bad('field "file" missing')
  if (file.size > MAX) return bad('too large', 413)
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bad('JPEG expected')
  const asset = await ctx.db.asset.create({
    data: { kind: 'image', url: '', author: ctx.identity.displayName ?? 'Du', licence: 'eigenes Foto', sourceUrl: '', origin: 'user', ownerId: ctx.identity.id },
    select: { id: true },
  })
  const url = photoUrl(asset.id)
  await writePhoto(asset.id, bytes)
  await ctx.db.asset.update({ where: { id: asset.id }, data: { url, sourceUrl: url } })
  return new Response(JSON.stringify({ id: asset.id, url }), { status: 201, headers })
}
