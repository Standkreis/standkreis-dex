// XP model (🙋 owner pick 2026-09-04, see You.tsx header). One place, read by Du and the Tagebuch.
// Tariff: first sighting of a species 25, a repeat once per species and month 10, a study 15, own photo +5, a done quest 40.
import raw from '../fixtures/sightings.json'

export type XpEntry = { id: string; kind: 'find' | 'study'; at: string; species: string; photo?: boolean }
export const XP = { erst: 25, find: 10, study: 15, photo: 5, quest: 40 }

const asc = (raw as XpEntry[]).slice().sort((a, b) => a.at.localeCompare(b.at))
const seen = new Set<string>()
const counted = new Set<string>()
/** XP per sighting id, computed in time order so "first" and "once a month" mean what they say. */
export const xpById = new Map<string, number>()
for (const e of asc) {
  if (e.kind === 'study') { xpById.set(e.id, XP.study); continue }
  const first = !seen.has(e.species); seen.add(e.species)
  const k = `${e.species}·${e.at.slice(0, 7)}`; const again = !first && !counted.has(k); counted.add(k)
  xpById.set(e.id, (first ? XP.erst : again ? XP.find : 0) + (e.photo ? XP.photo : 0))
}
