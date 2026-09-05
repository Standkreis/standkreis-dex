import { env } from '@/server/env'

// GET /api/tiles/<z>/<x>/<y> (handoff 0010 Track B, findings 0007 B3): the map's nine OSM raster tiles through the app's
// own origin. OSM's tile policy asks for an identifying User-Agent and no bulk; every phone hitting tile.openstreetmap.org
// with the browser's UA was neither. One week of public cache: Caddy's client, the browser and the worker (as an image)
// all keep it; a region's nine tiles at zoom 8 are ~100 KB. Zoom 0–19, integer x y within the zoom's range.
export const dynamic = 'force-dynamic'

const MAX_ZOOM = 19
const CACHE = 'public, max-age=604800'
const contact = env.WEBAUTHN_ORIGIN?.split(',')[0]?.trim() || 'https://standkreis.example'
const userAgent = `standkreis-dex/${process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'} (+${contact})`

const int = (s: string) => (/^\d{1,7}$/.test(s) ? Number(s) : NaN)

export async function GET(_req: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const p = await params
  const z = int(p.z), x = int(p.x), y = int(p.y)
  const span = 2 ** z
  if (!Number.isInteger(z) || z < 0 || z > MAX_ZOOM || !Number.isInteger(x) || !Number.isInteger(y) || x >= span || y >= span) return new Response('bad tile', { status: 400 })
  try {
    const upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, { headers: { 'user-agent': userAgent, accept: 'image/png,image/*;q=0.8' }, signal: AbortSignal.timeout(10_000) })
    if (!upstream.ok) return new Response(`upstream ${upstream.status}`, { status: 502 })
    const bytes = await upstream.arrayBuffer()
    return new Response(bytes, { headers: { 'content-type': upstream.headers.get('content-type') ?? 'image/png', 'cache-control': CACHE, 'content-length': String(bytes.byteLength) } })
  } catch {
    return new Response('upstream unreachable', { status: 502 })
  }
}
