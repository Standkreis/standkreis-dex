// Shared bits of the Steckbrief grill (handoff 0019): env from app/.env.local (values never printed), disk cache under
// .cache/, a fetch with the project's User-Agent and a per-host cap of 1 000 requests, tiny TSV/CSV readers.
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

export const HERE = new URL('.', import.meta.url).pathname
export const CACHE = join(HERE, '.cache')
mkdirSync(CACHE, { recursive: true })
export const UA = 'standkreis-dex/0019-steckbrief-grill (https://github.com/svreiser/standkreis-dex; svreiser@gmail.com)'
export const DEV_DB = 'postgresql://dex:dex@localhost:5433/dex'

/** KEY=value lines of app/.env.local (or $ENV_FILE) into process.env, no overwrite. Values are never logged. */
export function loadEnv() {
  const f = process.env.ENV_FILE ?? new URL('../../.env.local', import.meta.url).pathname
  if (!existsSync(f)) return
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
  }
}
export function keyOrNull(name) {
  loadEnv()
  const v = process.env[name]
  console.log(v ? `${name}: present, ${v.length} chars` : `${name}: absent`)
  return v ?? null
}

export const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'))
export const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 1))
export const cachePath = (name) => join(CACHE, name)
export const cached = (key) => { const f = cachePath(key + '.json'); return existsSync(f) ? readJson(f) : null }
export const store = (key, v) => writeJson(cachePath(key + '.json'), v)

const perHost = {}
export const requests = () => ({ ...perHost })
const CAP = 1000

/** GET with cache: text or JSON, keyed by URL hash. `binary` writes the raw bytes to `.cache/<file>` and returns the path. */
export async function get(url, { json = true, headers = {}, file = null, method = 'GET', body = null } = {}) {
  const host = new URL(url).host
  if (file) {
    const p = cachePath(file)
    if (existsSync(p) && statSync(p).size > 0) return p
  } else {
    const key = 'http-' + createHash('sha1').update(method + url + (body ?? '')).digest('hex')
    const hit = cached(key)
    if (hit) return hit.data
  }
  if ((perHost[host] = (perHost[host] ?? 0) + 1) > CAP) throw new Error(`request cap for ${host}`)
  const r = await fetch(url, { method, headers: { 'user-agent': UA, ...headers }, body, redirect: 'follow' })
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`HTTP ${r.status} ${url} ${t.slice(0, 200)}`) }
  if (file) {
    const buf = Buffer.from(await r.arrayBuffer())
    writeFileSync(cachePath(file), buf)
    console.log(`  ↓ ${file} ${(buf.length / 1e6).toFixed(1)} MB`)
    return cachePath(file)
  }
  const data = json ? await r.json() : await r.text()
  store('http-' + createHash('sha1').update(method + url + (body ?? '')).digest('hex'), { url, at: new Date().toISOString(), data })
  return data
}

/** CSV/TSV → rows as objects. Handles quoted fields with embedded commas and newlines. */
export function table(text, sep = ',') {
  const rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch }
    else if (ch === '"') q = true
    else if (ch === sep) { row.push(cur); cur = '' }
    else if (ch === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = '' }
    else cur += ch
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row) }
  const [head, ...body] = rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''))
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])))
}

export const norm = (s) => (s ?? '').trim().replace(/\s+/g, ' ')
export const TILES = ['birds', 'insects', 'plants', 'mammals', 'fungi', 'amphibians', 'reptiles', 'fish']
export const pct = (n, d) => (d ? `${Math.round((100 * n) / d)} %` : '—')

/** A markdown table from rows of cells. */
export const md = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n')
