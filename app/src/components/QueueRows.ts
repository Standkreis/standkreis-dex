import { dayKeyOf } from './JournalDate'
import type { Row as QueueRow } from './Queue'

// The diary's view of the outbox (handoff 0009 Track B): rows still waiting, or fallen out, rendered among the server's
// days with a chip. Pure functions, so they test without a browser.

export const KINDS = ['all', 'seen', 'studied'] as const // seen before studied (handoff 0014 D1)
export type Kind = (typeof KINDS)[number]
export type JournalRow = {
  id: string
  kind: 'sighting' | 'study'
  at: Date
  taxon: { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; lead: string | null }
  place: string | null
  photo: string | null
  note: string | null
  wildness: 'wild' | 'captive' | 'cultivated' | null
  first: boolean
  /** Set on outbox rows: waiting for the signal, or refused by the server ("erneut"). */
  queued?: 'waiting' | 'dead'
}
export type Day = { day: string; places: string[]; rows: JournalRow[] }

/** One outbox row as a diary row; photo rows are not rows of their own. */
export function toJournalRow(r: QueueRow): JournalRow | null {
  const queued = r.dead ? 'dead' : 'waiting'
  if (r.kind === 'sighting') {
    const p = r.payload
    return { id: r.id, kind: 'sighting', at: new Date(p.at), taxon: { ...p.taxon, lead: p.taxon.lead?.url ?? null }, place: p.place, photo: null, note: p.note ?? null, wildness: p.wildness, first: p.first, queued }
  }
  if (r.kind === 'study') return { id: r.id, kind: 'study', at: new Date(r.createdAt), taxon: { ...r.payload.taxon, lead: r.payload.taxon.lead?.url ?? null }, place: null, photo: null, note: null, wildness: null, first: false, queued }
  return null
}

/** The server's days with the outbox merged in by local day, newest first within a day; a day the server does not have yet is created. */
export function mergeQueued(days: Day[], outbox: QueueRow[], kind: Kind): Day[] {
  const extra = outbox.map(toJournalRow).filter((r): r is JournalRow => !!r && (kind === 'all' || (kind === 'studied' ? r.kind === 'study' : r.kind === 'sighting')))
  if (!extra.length) return days
  const byDay = new Map(days.map((d) => [d.day, { ...d, rows: [...d.rows] }]))
  for (const r of extra) {
    const key = dayKeyOf(r.at)
    const d = byDay.get(key) ?? { day: key, places: [], rows: [] }
    if (d.rows.some((x) => x.id === r.id)) continue // already on the server (the flush landed, the refetch is on its way)
    d.rows.push(r)
    d.rows.sort((a, b) => b.at.getTime() - a.at.getTime())
    if (r.place && !d.places.includes(r.place)) d.places = [...d.places, r.place]
    byDay.set(key, d)
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
}
