// GBIF: GADM search, occurrence facets, the backbone species record (spec §🗄️).
import { get, q } from './fetch'

const API = 'https://api.gbif.org/v1'

/** The window and record types of record 0002 E2: last ten years, observation records with coordinates. */
export const YEARS = process.env.ETL_YEARS ?? '2016,2026'
export const BASIS = ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'OCCURRENCE']
export const occurrenceBase = (gadmGid: string) => ({ year: YEARS, hasCoordinate: true, occurrenceStatus: 'PRESENT', basisOfRecord: BASIS, gadmGid })

export type Facet = { total: number; counts: { name: string; count: number }[] }
type FacetResponse = { count: number; facets?: { field: string; counts: { name: string; count: number }[] }[] }

/** One occurrence facet: how many records per value of `field`, plus the total. facetLimit 10000 covers a region's 5,250 species. */
export async function gbifFacet(field: string, params: Record<string, string | number | boolean | string[]>, limit = 10000): Promise<Facet> {
  const j = await get<FacetResponse>(`${API}/occurrence/search?${q({ ...params, limit: 0, facet: field, facetLimit: limit })}`)
  if (!j) throw new Error(`GBIF facet ${field} returned 404`)
  return { total: j.count, counts: j.facets?.[0]?.counts ?? [] }
}

export type Gadm = { gadmGid: string; name: string; higher: string; level: number }
type GadmResponse = { results: { id: string; name: string; gadmLevel: number; higherRegions?: { id: string; name: string }[] }[] }

/** Name or gid → the GADM level-2 unit GBIF indexes (record 0002 E1). A gid like DEU.11.19_1 is looked up directly. */
export async function resolveRegion(query: string): Promise<Gadm> {
  const isGid = /^[A-Z]{3}(\.\d+)+_\d+$/.test(query)
  const j = await get<GadmResponse>(`${API}/geocode/gadm/search?${q(isGid ? { gadmGid: query, limit: 5 } : { q: query, limit: 5 })}`)
  const results = j?.results ?? []
  const g = (isGid ? results.find((r) => r.id === query) : results.find((r) => r.gadmLevel === 2)) ?? results[0]
  if (!g) throw new Error(`no GADM unit for "${query}"`)
  return { gadmGid: g.id, name: g.name, higher: (g.higherRegions ?? []).map((h) => h.name).join(' › '), level: g.gadmLevel }
}

export type Species = {
  key: number
  nubKey?: number
  canonicalName?: string
  scientificName?: string
  rank?: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  taxonomicStatus?: string
}

/** The backbone record for a key; null when GBIF has none. */
export const gbifSpecies = (key: number | string) => get<Species>(`${API}/species/${key}`)

export type Match = Species & { usageKey?: number; matchType?: string; status?: string; acceptedUsageKey?: number }
/** Backbone match by name for GloBI targets (strict, exact matches only are used); null when GBIF has nothing. */
export const gbifMatch = (name: string) => get<Match>(`${API}/species/match?${q({ name, strict: true })}`)
