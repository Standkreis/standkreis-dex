'use client'

import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/server/routers/_app'
import { enqueue, rowOf, rowsNow, update, type Row } from './Queue'

// The scan on the client (handoff 0016 Track B, record 0003). Nothing here is a new store: the answers ride in
// localStorage keyed by the photo (so a reload of `/log?photo=…&scan=1` shows the ladder again without a second call),
// the "unbestimmt" sighting of an offline snap is a `scan` row of the existing outbox (Queue.ts), and the ⓘ of a
// scanned sighting (B6) reads the line the save screen bound to the sighting's id.

export type ScanResult = inferRouterOutputs<AppRouter>['sighting']['identify']
export type ScanRow = Row & { kind: 'scan' }
export type ScanRegion = { id: string; name: string }
export const ENGINE = 'Claude Sonnet 5'

const KEY = 'dex.scan.'
const NOTED = 'dex.scan.noted'
const read = <T,>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null } catch { return null } }
const put = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota: the ⓘ loses its cost line, nothing else */ } }

/** B1: the first-upload sentence shows once. Set when the first photo of this profile goes up, on this device. */
export const uploadNoted = () => typeof localStorage !== 'undefined' && localStorage.getItem(NOTED) === '1'
export const noteUpload = () => { try { localStorage.setItem(NOTED, '1') } catch { /* then the sentence shows again; harmless */ } }

/** The answer for a photo: localStorage (an online scan), else the ladder on the photo's outbox `scan` row (an offline one). Kept until the sighting is saved (`bindScan`). */
export const scanOf = (photoId: string | null): ScanResult | null => (photoId ? read<ScanResult>(KEY + photoId) ?? scanRowFor(photoId)?.payload.ladder ?? null : null)
export const rememberScan = (photoId: string, r: ScanResult) => put(KEY + photoId, r)

/** What the ⓘ on a scanned sighting shows (B6): the engine, the cost line, whether the saved species is the engine's answer. */
export type ScanNote = { engine: string; cents: number; taken: boolean; at: string }
export const scanNoteOf = (sightingId: string) => read<ScanNote>(`${KEY}s.${sightingId}`)
/** The save screen moves the photo's answer under the sighting's id; `gbifKey` is what was saved, so `taken` says if it was the engine's. */
export function bindScan(sightingId: string, photoId: string | null, gbifKey: number) {
  const r = scanOf(photoId)
  if (!r || !photoId) return
  put(`${KEY}s.${sightingId}`, { engine: ENGINE, cents: r.cost.cents, taken: r.answer?.gbifKey === gbifKey, at: new Date().toISOString() } satisfies ScanNote)
  try { localStorage.removeItem(KEY + photoId) } catch { /* ignore */ }
}

/** The confidence as words (record I3, handoff B3): sicher ≥ 0.7 · wahrscheinlich ≥ 0.4 · unsicher. Never a number on screen. */
export const confidenceWord = (c: number): 'sure' | 'likely' | 'unsure' => (c >= 0.7 ? 'sure' : c >= 0.4 ? 'likely' : 'unsure')

/** The outbox `scan` row behind a photo id from the URL: the offline snap's "unbestimmt" sighting, by its queued blob or its uploaded Asset. */
export const scanRowFor = (photoId: string | null): ScanRow | null => {
  if (!photoId) return null
  const r = rowsNow().find((x): x is ScanRow => x.kind === 'scan' && (x.payload.photoRow === photoId || x.payload.photoId === photoId))
  return r ?? null
}
export const scanRow = (id: string): ScanRow | null => { const r = rowOf(id); return r?.kind === 'scan' ? r : null }

/**
 * B5: a snap without signal. The photo is already a `photo` row of the outbox (uploadOrQueue); this puts the sighting
 * next to it as a `scan` row with `idPending`. The flush uploads the blob, calls `identify` and writes the ladder to the
 * row; the diary shows the row as "unbestimmt" with a badge until the user takes or rejects the answer on the save
 * screen, which removes the row. The point is taken silently when the browser already granted it, as the save screen does.
 */
export async function enqueueScan({ photoRow, photoId, region }: { photoRow?: string; photoId?: string; region: ScanRegion }): Promise<ScanRow> {
  const row = (await enqueue({ id: crypto.randomUUID(), kind: 'scan', payload: { at: new Date().toISOString(), place: region.name, regionId: region.id, photoRow, photoId, idPending: true } })) as ScanRow
  try {
    const p = await navigator.permissions?.query({ name: 'geolocation' })
    if (p?.state === 'granted') navigator.geolocation.getCurrentPosition((pos) => void update(row.id, (r) => (r.kind === 'scan' ? { ...r, payload: { ...r.payload, lat: pos.coords.latitude, lng: pos.coords.longitude } } : r)), () => {}, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 })
  } catch { /* no permissions API: the region's name stands */ }
  return row
}
