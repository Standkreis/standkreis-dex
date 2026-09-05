// Wikidata (spec §🗄️, record 0002 E6): one SPARQL batch by GBIF key (P846), one by exact taxon name (P225) for the
// misses. Ported from scripts/etl-probe/lib.mjs wikidataForGbif; adds P4024 (AnAge), the Japanese label and the rank check.
import { get } from './fetch'

const SPARQL = 'https://query.wikidata.org/sparql'
const SPECIES = 'http://www.wikidata.org/entity/Q7432'
const BATCH = 120

export type WdItem = {
  qid: string
  rank?: string
  deLabel?: string
  enLabel?: string
  jaLabel?: string
  img?: string
  iucn?: string
  anage?: string
  dewiki?: string
  enwiki?: string
}
type Binding = Record<string, { value: string } | undefined>

const fields = `(SAMPLE(?rank_) AS ?rank) (SAMPLE(?de) AS ?de) (SAMPLE(?en) AS ?en) (SAMPLE(?ja) AS ?ja) (SAMPLE(?img_) AS ?img) (SAMPLE(?iucnL) AS ?iucn) (SAMPLE(?anage_) AS ?anage) (SAMPLE(?dewiki_) AS ?dewiki) (SAMPLE(?enwiki_) AS ?enwiki)`
const optionals = `
  OPTIONAL { ?item wdt:P105 ?rank_ }
  OPTIONAL { ?item rdfs:label ?de FILTER(LANG(?de)="de") }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en)="en") }
  OPTIONAL { ?item rdfs:label ?ja FILTER(LANG(?ja)="ja") }
  OPTIONAL { ?item wdt:P18 ?img_ }
  OPTIONAL { ?item wdt:P141 ?iucn . ?iucn rdfs:label ?iucnL FILTER(LANG(?iucnL)="en") }
  OPTIONAL { ?item wdt:P4024 ?anage_ }
  OPTIONAL { ?dewiki_ schema:about ?item ; schema:isPartOf <https://de.wikipedia.org/> }
  OPTIONAL { ?enwiki_ schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }`

const toItem = (b: Binding): WdItem => ({
  qid: b.item!.value.split('/').pop()!,
  rank: b.rank?.value,
  deLabel: b.de?.value,
  enLabel: b.en?.value,
  jaLabel: b.ja?.value,
  img: b.img?.value,
  iucn: b.iucn?.value,
  anage: b.anage?.value,
  dewiki: b.dewiki?.value,
  enwiki: b.enwiki?.value,
})

async function sparql(query: string): Promise<Binding[]> {
  const j = await get<{ results: { bindings: Binding[] } }>(`${SPARQL}?format=json&query=${encodeURIComponent(query)}`)
  return j?.results.bindings ?? []
}

/** All items carrying P846 = one of the keys, grouped by key (a key can have two items). */
async function byGbifKey(keys: number[]) {
  const out = new Map<number, WdItem[]>()
  for (let i = 0; i < keys.length; i += BATCH) {
    const vals = keys.slice(i, i + BATCH).map((k) => `"${k}"`).join(' ')
    const rows = await sparql(`SELECT ?gbif ?item ${fields} WHERE { VALUES ?gbif { ${vals} } ?item wdt:P846 ?gbif . ${optionals} } GROUP BY ?gbif ?item`)
    for (const b of rows) {
      const k = Number(b.gbif!.value)
      out.set(k, [...(out.get(k) ?? []), toItem(b)])
    }
  }
  return out
}

/** All items whose taxon name (P225) is exactly one of the names, grouped by name. */
async function byName(names: string[]) {
  const out = new Map<string, WdItem[]>()
  for (let i = 0; i < names.length; i += BATCH) {
    const vals = names.slice(i, i + BATCH).map((n) => JSON.stringify(n)).join(' ')
    const rows = await sparql(`SELECT ?name ?item ${fields} WHERE { VALUES ?name { ${vals} } ?item wdt:P225 ?name . ${optionals} } GROUP BY ?name ?item`)
    for (const b of rows) {
      const n = b.name!.value
      out.set(n, [...(out.get(n) ?? []), toItem(b)])
    }
  }
  return out
}

export type WdMatch = { path: 'P846' | 'name' | 'none'; item: WdItem | null; note?: string }

/** E6: two items → the one with a dewiki sitelink; an item that is not rank species → nothing from Wikidata. */
function choose(items: WdItem[] | undefined, path: 'P846' | 'name'): WdMatch | null {
  if (!items?.length) return null
  const item = items.find((i) => i.dewiki) ?? items[0]
  if (item.rank !== SPECIES) return { path: 'none', item: null, note: `${item.qid} via ${path} is not a species (${item.rank?.split('/').pop() ?? 'no rank'})` }
  return { path, item, note: items.length > 1 ? `${items.length} items via ${path}, took ${item.qid}` : undefined }
}

/** The Wikidata match per GBIF key: P846 first, then the exact name; `path` is stored as Taxon.namePath. */
export async function wikidataFor(taxa: { gbifKey: number; sciName: string }[]): Promise<Map<number, WdMatch>> {
  const out = new Map<number, WdMatch>()
  const keyed = await byGbifKey(taxa.map((t) => t.gbifKey))
  const missing: typeof taxa = []
  for (const t of taxa) {
    const m = choose(keyed.get(t.gbifKey), 'P846')
    if (m) out.set(t.gbifKey, m)
    else missing.push(t)
  }
  const named = missing.length ? await byName(missing.map((t) => t.sciName)) : new Map<string, WdItem[]>()
  for (const t of missing) out.set(t.gbifKey, choose(named.get(t.sciName), 'name') ?? { path: 'none', item: null })
  return out
}
