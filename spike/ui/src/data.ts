import raw from '../fixtures/species.json'
import factsRaw from '../fixtures/facts.json'
import type { Facts, Species } from './types'

const facts = factsRaw as Record<string, Facts | string>
export const species = (raw as Species[]).map((s) => (typeof facts[s.id] === 'object' ? { ...s, facts: facts[s.id] as Facts } : s))
export const byId = new Map(species.map((s) => [s.id, s]))
export const counters = {
  studied: species.filter((s) => s.state.studied).length,
  seen: species.filter((s) => s.state.seen).length,
  both: species.filter((s) => s.state.studied && s.state.seen).length,
  total: species.length,
}
