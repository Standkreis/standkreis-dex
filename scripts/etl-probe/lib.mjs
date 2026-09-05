// Shared helpers for the throwaway ETL probe. Cached fetch, budget, geometry, tables.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const here = dirname(fileURLToPath(import.meta.url))
export const UA = 'standkreis-dex-etl-probe/0.1 (https://github.com/svreiser/standkreis-dex; svreiser@gmail.com)'
const CACHE = join(here, '.cache')
const OUT = join(here, 'out')
const BUDGET = 1000
const budget = {}
const lastHit = {}
const MIN_GAP = { 'api.inaturalist.org': 1100, 'query.wikidata.org': 300, 'api.globalbioticinteractions.org': 300 }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** GET JSON with disk cache, per-host budget (1,000/run), polite gaps and retries. */
export async function get(url, { headers = {}, text = false } = {}) {
  const host = new URL(url).hostname
  const dir = join(CACHE, host)
  const file = join(dir, createHash('sha1').update(url).digest('hex') + (text ? '.txt' : '.json'))
  if (existsSync(file)) { const raw = readFileSync(file, 'utf8'); return text ? raw : JSON.parse(raw) }
  budget[host] = (budget[host] ?? 0) + 1
  if (budget[host] > BUDGET) throw new Error(`budget exhausted for ${host} (${BUDGET}/run)`)
  const gap = MIN_GAP[host] ?? 100
  const wait = (lastHit[host] ?? 0) + gap - Date.now()
  if (wait > 0) await sleep(wait)
  let lastErr
  for (let attempt = 0; attempt < 5; attempt++) {
    lastHit[host] = Date.now()
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: text ? '*/*' : 'application/json', ...headers } })
      if (r.status === 404) { mkdirSync(dir, { recursive: true }); writeFileSync(file, text ? '' : 'null'); return text ? '' : null }
      if (r.status === 429 || r.status >= 500) { lastErr = new Error(`${r.status} ${url}`); await sleep(1500 * 2 ** attempt); continue }
      if (!r.ok) throw new Error(`${r.status} ${url}`)
      const body = await r.text()
      if (!text) JSON.parse(body)
      mkdirSync(dir, { recursive: true })
      writeFileSync(file, body)
      return text ? body : JSON.parse(body)
    } catch (e) { lastErr = e; if (!/^(429|5\d\d) /.test(e.message) && !/fetch failed/.test(e.message)) throw e; await sleep(1500 * 2 ** attempt) }
  }
  throw lastErr
}

export const requests = () => ({ ...budget })
export const q = (params) => Object.entries(params).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).filter((x) => x !== undefined).map((x) => `${k}=${encodeURIComponent(x)}`)).join('&')

/** GBIF occurrence facet: returns [{ name, count }] for one facet field. */
export async function gbifFacet(field, params, limit = 5000) {
  const j = await get(`https://api.gbif.org/v1/occurrence/search?${q({ ...params, limit: 0, facet: field, facetLimit: limit })}`)
  return { total: j.count, counts: j.facets?.[0]?.counts ?? [] }
}

export function save(name, data) { mkdirSync(OUT, { recursive: true }); const f = join(OUT, name); writeFileSync(f, JSON.stringify(data, null, 1)); return f }
export function load(name) { const f = join(OUT, name); if (!existsSync(f)) throw new Error(`missing ${f}, run the script that writes it first`); return JSON.parse(readFileSync(f, 'utf8')) }

/** Markdown table. rows: array of arrays; head: array of strings. */
export function table(head, rows) {
  const line = (r) => `| ${r.map((c) => String(c ?? '')).join(' | ')} |`
  return [line(head), `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(line)].join('\n')
}

export const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def }

// ── geometry ──────────────────────────────────────────────────────────────
/** Ray-cast point in ring. ring: [[lon,lat],…] */
function inRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
/** GeoJSON Polygon/MultiPolygon → outer rings */
export const rings = (g) => g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map((p) => p[0])
export const inside = (pt, g) => rings(g).some((r) => inRing(pt, r))
export function bbox(g) {
  let w = 180, s = 90, e = -180, n = -90
  for (const r of rings(g)) for (const [x, y] of r) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y) }
  return { w, s, e, n }
}
/** Ring area in km² (spherical approx, shoelace on equirectangular). */
export function areaKm2(g) {
  const R = 6371
  return rings(g).reduce((sum, r) => {
    let a = 0
    const lat0 = (r.reduce((s, p) => s + p[1], 0) / r.length) * Math.PI / 180
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = r[i][0] * Math.PI / 180 * R * Math.cos(lat0), yi = r[i][1] * Math.PI / 180 * R
      const xj = r[j][0] * Math.PI / 180 * R * Math.cos(lat0), yj = r[j][1] * Math.PI / 180 * R
      a += xj * yi - xi * yj
    }
    return sum + Math.abs(a) / 2
  }, 0)
}
/**
 * Global lat/lon grid of ~km-sized cells covering the geometry. Cells are anchored at 0°,
 * so the same cell ids come out for any region (what an ETL would key on).
 * Returns [{ id, w, s, e, n, wkt, centerInside }]. A cell is kept if its centre or a corner
 * is inside, or a polygon vertex lies in it.
 */
export function gridOver(g, km) {
  const dLat = km / 111.32
  const { w, s, e, n } = bbox(g)
  const midLat = (s + n) / 2
  const dLon = km / (111.32 * Math.cos((midLat * Math.PI) / 180))
  const verts = rings(g).flat()
  const cells = []
  for (let i = Math.floor(s / dLat); i * dLat < n; i++) {
    for (let j = Math.floor(w / dLon); j * dLon < e; j++) {
      const cs = i * dLat, cn = cs + dLat, cw = j * dLon, ce = cw + dLon
      const pts = [[cw, cs], [ce, cs], [cw, cn], [ce, cn], [(cw + ce) / 2, (cs + cn) / 2]]
      const hit = pts.some((p) => inside(p, g)) || verts.some(([x, y]) => x >= cw && x < ce && y >= cs && y < cn)
      if (!hit) continue
      const f = (x) => x.toFixed(4)
      cells.push({ id: `${km}km:${i}:${j}`, w: cw, s: cs, e: ce, n: cn, centerInside: inside(pts[4], g),
        wkt: `POLYGON((${f(cw)} ${f(cs)},${f(ce)} ${f(cs)},${f(ce)} ${f(cn)},${f(cw)} ${f(cn)},${f(cw)} ${f(cs)}))` })
    }
  }
  return cells
}

// ── region resolution ─────────────────────────────────────────────────────
/** Landkreis → GBIF GADM gid + iNat place (id + polygon). */
export async function resolveRegion(name) {
  const gadm = await get(`https://api.gbif.org/v1/geocode/gadm/search?${q({ q: name, limit: 5 })}`)
  const g = gadm.results.find((r) => r.gadmLevel === 2) ?? gadm.results[0]
  const inat = await get(`https://api.inaturalist.org/v1/places/autocomplete?${q({ q: name })}`)
  const p = inat.results.find((r) => r.admin_level != null) ?? inat.results[0]
  if (!g || !p) throw new Error(`could not resolve ${name}: gadm=${!!g} inat=${!!p}`)
  return { name, gadmGid: g.id, gadmName: g.name, higher: g.higherRegions?.map((h) => h.name).join(' › '), inatPlaceId: p.id, inatName: p.display_name, geometry: p.geometry_geojson }
}

/** GBIF species record, cached. */
export const gbifSpecies = (key) => get(`https://api.gbif.org/v1/species/${key}`)

/** Wikidata rows for GBIF keys in batches: de/en label, QID, P18, IUCN, dewiki/enwiki title. */
export async function wikidataForGbif(keys) {
  const out = {}
  for (let i = 0; i < keys.length; i += 120) {
    const vals = keys.slice(i, i + 120).map((k) => `"${k}"`).join(' ')
    const sparql = `SELECT ?gbif ?item (SAMPLE(?de) AS ?de) (SAMPLE(?en) AS ?en) (SAMPLE(?img) AS ?img) (SAMPLE(?iucnL) AS ?iucn) (SAMPLE(?dewiki) AS ?dewiki) (SAMPLE(?enwiki) AS ?enwiki) (SAMPLE(?rankL) AS ?rank) WHERE {
      VALUES ?gbif { ${vals} } ?item wdt:P846 ?gbif .
      OPTIONAL { ?item rdfs:label ?de FILTER(LANG(?de)="de") } OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en)="en") }
      OPTIONAL { ?item wdt:P18 ?img } OPTIONAL { ?item wdt:P141 ?iucn . ?iucn rdfs:label ?iucnL FILTER(LANG(?iucnL)="en") }
      OPTIONAL { ?item wdt:P105 ?rk . ?rk rdfs:label ?rankL FILTER(LANG(?rankL)="en") }
      OPTIONAL { ?dewiki schema:about ?item ; schema:isPartOf <https://de.wikipedia.org/> }
      OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> } } GROUP BY ?gbif ?item`
    const j = await get(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`)
    for (const b of j.results.bindings) {
      const k = b.gbif.value
      if (out[k]) { out[k].multi = true; continue }
      const title = (u) => u ? decodeURIComponent(u.split('/').pop()).replace(/_/g, ' ').replace(/ \(.*\)$/, '') : undefined
      const sciLike = (x) => !x || /^[A-Z][a-z-]+ [a-z-]+( [a-z-]+)?$/.test(x)
      // German Wikidata labels for taxa are usually the scientific name; the dewiki title carries the vernacular.
      out[k] = { qid: b.item.value.split('/').pop(), de: title(b.dewiki?.value) ?? (sciLike(b.de?.value) ? undefined : b.de.value), deLabel: b.de?.value, en: b.en?.value, img: b.img?.value, iucn: b.iucn?.value, rank: b.rank?.value, dewiki: b.dewiki?.value, enwiki: b.enwiki?.value }
    }
  }
  return out
}

/** Run fn over items with at most n in flight, preserving order. */
export async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k) } }))
  return out
}
