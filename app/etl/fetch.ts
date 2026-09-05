// The fetch layer, ported from scripts/etl-probe/lib.mjs (record 0002 E11): GET JSON or text with a URL-keyed disk
// cache under etl/.cache/<host>/, a per-host budget per run (50,000, `ETL_BUDGET`), per-host gaps as reserved slots, an in-flight cap for GBIF, retries with backoff, one User-Agent.
// The probe ran ~7,000 responses on exactly these settings with zero 429s.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const UA = 'standkreis-dex/0.1 (https://github.com/svreiser/standkreis-dex; svreiser@gmail.com)'
export const CACHE = join(dirname(fileURLToPath(import.meta.url)), '.cache')
const BUDGET = Number(process.env.ETL_BUDGET ?? 50_000)
/** Minimum gap between two requests to one host, ms. iNaturalist allows ~1/s; Wikidata and GloBI ~3/s. */
const MIN_GAP: Record<string, number> = { 'api.inaturalist.org': 1100, 'query.wikidata.org': 300, 'api.globalbioticinteractions.org': 300, 'api.gbif.org': 0 }
/** GBIF has no per-second rule; it is bounded by requests in flight instead (the probe ran 4–6). */
const MAX_INFLIGHT: Record<string, number> = { 'api.gbif.org': 6 }
const ATTEMPTS = 5

const budget: Record<string, number> = {}
/** The next free slot per host, reserved before sleeping: parallel callers queue instead of firing together. */
const nextSlot: Record<string, number> = {}
const inflight: Record<string, number> = {}
const waiters: Record<string, (() => void)[]> = {}
const acquire = (host: string) => {
  const max = MAX_INFLIGHT[host]
  if (!max) return Promise.resolve()
  if ((inflight[host] ?? 0) < max) {
    inflight[host] = (inflight[host] ?? 0) + 1
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => (waiters[host] ??= []).push(() => { inflight[host]++; resolve() }))
}
const release = (host: string) => {
  if (!MAX_INFLIGHT[host]) return
  inflight[host]--
  waiters[host]?.shift()?.()
}
const stats = { hits: 0, misses: 0, retries: 0, tooMany: 0 }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Opts = { headers?: Record<string, string>; text?: boolean }

/** GET with cache. A 404 is cached as null (or '' for text). Throws after five attempts on 429/5xx/network errors. */
export async function get<T = unknown>(url: string, opts?: Opts & { text?: false }): Promise<T | null>
export async function get(url: string, opts: Opts & { text: true }): Promise<string>
export async function get(url: string, { headers = {}, text = false }: Opts = {}): Promise<unknown> {
  const host = new URL(url).hostname
  const dir = join(CACHE, host)
  const file = join(dir, createHash('sha1').update(url).digest('hex') + (text ? '.txt' : '.json'))
  if (existsSync(file)) {
    stats.hits++
    const raw = readFileSync(file, 'utf8')
    return text ? raw : JSON.parse(raw)
  }
  budget[host] = (budget[host] ?? 0) + 1
  if (budget[host] > BUDGET) throw new Error(`budget exhausted for ${host} (${BUDGET}/run)`)
  stats.misses++
  const gap = MIN_GAP[host] ?? 100
  const slot = async () => {
    const at = Math.max(Date.now(), nextSlot[host] ?? 0)
    nextSlot[host] = at + gap
    const wait = at - Date.now()
    if (wait > 0) await sleep(wait)
  }
  await acquire(host)
  try {
    return await attempts()
  } finally {
    release(host)
  }

  async function attempts(): Promise<unknown> {
    let lastErr: Error | undefined
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      await slot()
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: text ? '*/*' : 'application/json', ...headers } })
        if (r.status === 404) {
          mkdirSync(dir, { recursive: true })
          writeFileSync(file, text ? '' : 'null')
          return text ? '' : null
        }
        if (r.status === 429 || r.status >= 500) {
          if (r.status === 429) stats.tooMany++
          stats.retries++
          lastErr = new Error(`${r.status} ${url}`)
          await sleep(1500 * 2 ** attempt)
          continue
        }
        if (!r.ok) throw new Error(`${r.status} ${url}`)
        const body = await r.text()
        if (!text) JSON.parse(body)
        mkdirSync(dir, { recursive: true })
        writeFileSync(file, body)
        return text ? body : JSON.parse(body)
      } catch (e) {
        lastErr = e as Error
        if (!/fetch failed|ECONNRESET|ETIMEDOUT|UND_ERR/.test(lastErr.message)) throw e
        stats.retries++
        await sleep(1500 * 2 ** attempt)
      }
    }
    throw lastErr
  }
}

/** Requests actually sent per host this run (cache hits excluded), plus hit/miss/retry/429 counters; `misses` is the network total. */
export const requests = () => ({ perHost: { ...budget }, ...stats })

/** Query string; array values repeat the key (GBIF style), undefined values are dropped. */
export const q = (params: Record<string, string | number | boolean | (string | number)[] | undefined>) =>
  Object.entries(params)
    .flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).filter((x) => x !== undefined).map((x) => `${k}=${encodeURIComponent(String(x))}`))
    .join('&')

/** Run fn over items with at most n in flight, preserving order. */
export async function pool<T, R>(items: readonly T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++
        out[k] = await fn(items[k], k)
      }
    }),
  )
  return out
}
