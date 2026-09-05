'use client'

import { useSyncExternalStore } from 'react'
import { createStore, del, entries, set } from 'idb-keyval'
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client'
import superjson from 'superjson'
import type { AppRouter } from '@/server/routers/_app'

// The sightings queue (handoff 0009 Track B). One IndexedDB store `outbox`; every save from the save screen writes a row
// here first and then flushes. Online the flush lands in the same tick; in the forest the row waits for the signal.
// The client mints the Sighting id, so a retried flush is idempotent on the server (`sighting.create` upserts by id).

export type Lead = { url: string; author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string } | null
export type QueueTaxon = { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; lead: Lead }
export type Wildness = 'wild' | 'captive' | 'cultivated'

export type SightingPayload = {
  taxonId: string
  at: string // ISO, the phone's clock (findings 0008 A4)
  lat?: number
  lng?: number
  note?: string
  wildness: Wildness
  /** An Asset already on the server (uploaded online), bound at create. */
  photoId?: string
  /** A `photo` row of this outbox (uploaded offline); the flush uploads it first and binds the returned Asset id. */
  photoRow?: string
  /** What the diary and the sheet render before the server has the row. */
  taxon: QueueTaxon
  place: string | null
  /** The client's "first" (no seenAt for the taxon); the server's wins after the flush. */
  first: boolean
}
export type PhotoPayload = { forSighting?: string }
export type StudyPayload = { taxonId: string; taxon: QueueTaxon }

export type Row = { id: string; createdAt: number; attempts: number; lastError: string | null; dead?: boolean } & (
  | { kind: 'sighting'; payload: SightingPayload; blob?: undefined }
  | { kind: 'photo'; payload: PhotoPayload; blob: Blob }
  | { kind: 'study'; payload: StudyPayload; blob?: undefined }
)
export type Kind = Row['kind']
export type Flushed = { row: Row; result: unknown }

export const MAX_ROWS = 50
export const MAX_BLOB = 2 * 1024 * 1024
export class QueueFull extends Error { constructor() { super('queue full') } }

const api = process.env.NEXT_PUBLIC_API_URL ?? ''
const store = typeof indexedDB === 'undefined' ? null : createStore('dex-outbox', 'outbox')
// A vanilla client of its own: the flush runs outside React (timers, the online event) and must not depend on the provider.
const client = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: `${api}/api/trpc`, transformer: superjson, fetch: (url, opts) => fetch(url, { ...opts, credentials: 'include' }) })] })

// ── The in-memory mirror: every read of the box goes through it, every write updates it and IndexedDB and tells the listeners ──
let rows: Row[] = []
let loaded: Promise<void> | null = null
const listeners = new Set<() => void>()
const flushedListeners = new Set<(f: Flushed) => void>()
const notify = () => { for (const l of listeners) l() }
const byAge = (a: Row, b: Row) => a.createdAt - b.createdAt

export function load(): Promise<void> {
  if (!store) return Promise.resolve()
  return (loaded ??= entries<string, Row>(store).then((all) => { rows = all.map(([, r]) => r).sort(byAge); notify() }).catch(() => undefined))
}
export const rowsNow = () => rows
export const rowOf = (id: string) => rows.find((r) => r.id === id)
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
export function onFlushed(l: (f: Flushed) => void) { flushedListeners.add(l); return () => { flushedListeners.delete(l) } }
/** The rows of the box as React state; loaded once, then live. */
export function useOutbox(): Row[] {
  return useSyncExternalStore(subscribe, rowsNow, () => empty)
}
const empty: Row[] = []

async function write(row: Row) {
  rows = [...rows.filter((r) => r.id !== row.id), row].sort(byAge)
  notify()
  if (store) await set(row.id, row, store)
}
export async function remove(id: string) {
  rows = rows.filter((r) => r.id !== id)
  notify()
  if (store) await del(id, store)
}

/**
 * Put a row into the box. The 51st row is refused (`QueueFull`): iOS evicts the store after seven unused days (record
 * Q5), so the box stays small and the save screen says "Erst wieder ins Netz". A blob over 2 MB is refused the same way.
 */
export async function enqueue(row: Omit<Row, 'createdAt' | 'attempts' | 'lastError'> & { id: string }): Promise<Row> {
  await load()
  if (rows.filter((r) => !r.dead).length >= MAX_ROWS) throw new QueueFull()
  if (row.blob && row.blob.size > MAX_BLOB) throw new QueueFull()
  const full = { ...row, createdAt: Date.now(), attempts: 0, lastError: null } as Row
  await write(full)
  return full
}

/** "Erneut" on a row that fell out: back into the line. */
export async function retry(id: string) {
  const r = rowOf(id)
  if (!r) return
  await write({ ...r, dead: false, lastError: null, attempts: 0 })
  void flush()
}

// ── The flush ──
/** A response that came back: 4xx other than 401 and 429 means the row is wrong and falls out; everything else waits. */
class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
function verdict(e: unknown): 'dead' | 'wait' {
  const status = e instanceof TRPCClientError ? (e.data as { httpStatus?: number } | undefined)?.httpStatus : e instanceof HttpError ? e.status : undefined
  if (status === undefined) return 'wait' // no answer: offline, a timeout, a dead server
  return status >= 400 && status < 500 && status !== 401 && status !== 429 ? 'dead' : 'wait'
}
const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200)

async function upload(blob: Blob): Promise<{ id: string; url: string }> {
  const form = new FormData()
  form.append('file', blob, 'photo.jpg')
  const r = await fetch(`${api}/api/photo`, { method: 'POST', body: form, credentials: 'include' })
  if (!r.ok) throw new HttpError(r.status, `upload ${r.status}`)
  return (await r.json()) as { id: string; url: string }
}

/** Send one row. A sighting with a queued photo uploads it first; a photo that the server refuses (4xx) is dropped and the sighting goes without it. */
async function send(row: Row): Promise<unknown> {
  if (row.kind === 'sighting') {
    const p = row.payload
    let photoId = p.photoId
    const photo = p.photoRow ? rowOf(p.photoRow) : undefined
    if (photo?.kind === 'photo') {
      try {
        photoId = (await upload(photo.blob)).id
        await remove(photo.id)
        await write({ ...row, payload: { ...p, photoRow: undefined, photoId } })
      } catch (e) {
        if (verdict(e) !== 'dead') throw e
        await remove(photo.id) // the file is wrong (not a JPEG, too big); the sighting must not wait on it
        await write({ ...row, payload: { ...p, photoRow: undefined }, lastError: message(e) })
      }
    }
    return client.sighting.create.mutate({ id: row.id, taxonId: p.taxonId, at: new Date(p.at), lat: p.lat, lng: p.lng, note: p.note, wildness: p.wildness, photoId })
  }
  if (row.kind === 'study') return client.study.mark.mutate({ taxonId: row.payload.taxonId })
  // A photo row alone: bound to a sighting that already exists on the server (kind `photo` with forSighting); an unbound one waits for its sighting row.
  if (row.payload.forSighting) {
    const a = await upload(row.blob)
    return client.sighting.attachPhoto.mutate({ sightingId: row.payload.forSighting, photoId: a.id })
  }
  return null
}

const ORPHAN_AGE = 24 * 3_600_000
let running: Promise<void> | null = null
/**
 * Flush the box: in order, one row at a time. The first row without an answer stops the run (the signal is gone, or the
 * server is); a row the server refuses falls out with its payload kept and its error shown, the line behind it moves on.
 * One run at a time; a second call while one runs joins it.
 */
export function flush(): Promise<void> {
  return (running ??= run().finally(() => { running = null }))
}
async function run() {
  await load()
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  for (const row of [...rows]) {
    if (row.dead) continue
    if (row.kind === 'photo' && !row.payload.forSighting) {
      // Waits for its sighting; if none ever comes (chooser → back), it goes after a day, like the server's abandoned Assets.
      if (Date.now() - row.createdAt > ORPHAN_AGE && !rows.some((r) => r.kind === 'sighting' && r.payload.photoRow === row.id)) await remove(row.id)
      continue
    }
    try {
      const result = await send(row)
      await remove(row.id)
      for (const l of flushedListeners) l({ row, result })
    } catch (e) {
      const current = rowOf(row.id) ?? row
      const dead = verdict(e) === 'dead'
      await write({ ...current, attempts: current.attempts + 1, lastError: message(e), dead })
      if (!dead) return
    }
  }
}

/** Resolve with the server's answer for one row when it lands within `ms`, else null: the save screen waits this long and no longer. */
export function landing<T>(id: string, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const off = onFlushed((f) => { if (f.row.id === id) { off(); clearTimeout(h); resolve(f.result as T) } })
    const h = setTimeout(() => { off(); resolve(null) }, ms)
  })
}

/** Still waiting or fallen out: what the diary merges in. */
export const pending = (all: Row[]) => all.filter((r) => r.kind !== 'photo')
/** Is there a wild row for this taxon already in the box (so a second offline save of the same species is not "first")? */
export const queuedWild = (all: Row[], taxonId: string) => all.some((r) => r.kind === 'sighting' && r.payload.taxonId === taxonId && r.payload.wildness === 'wild')
