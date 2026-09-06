// 0015b step 2: the seven-rank string BioCLIP wants ("Kingdom Phylum Class Order Family Genus epithet") for every row of
// ../set.json, from api.gbif.org/v1/species/<gbifKey>, plus ~200 distractors (cultivated and pot plants, the most-recorded
// species in Germany that are not in the set). Every GBIF answer is cached under ../.cache/gbif-taxonomy.json; the
// distractor pull is capped at 200 requests beyond the 929 lookups. Run from app/: node scripts/id-probe/bioclip/taxonomy.mjs
// Output: taxonomy.json (929 rows) and distractors.json next to this file, both committed so bioclip.py needs no network.
import { writeFileSync } from 'node:fs'
import { cached, store, set } from '../lib.mjs'

const UA = 'standkreis-dex id-probe 0015b (personal atlas over open biodiversity data; svreiser@gmail.com)'
const GBIF = 'https://api.gbif.org/v1'
const OUT = new URL('.', import.meta.url).pathname
const CONC = 4
const DISTRACTOR_CAP = 200

const taxo = cached('gbif-taxonomy') ?? {} // gbifKey → seven ranks
let extra = cached('gbif-requests')?.extra ?? 0 // requests beyond the set lookups, cumulative over runs (the cap is a budget, not a per-run limit)
const gbif = async (path) => {
  store('gbif-requests', { extra })
  const r = await fetch(`${GBIF}${path}`, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`GBIF ${r.status} ${path}`)
  return r.json()
}
const ranks = (d) => ({ kingdom: d.kingdom, phylum: d.phylum, class: d.class, order: d.order, family: d.family, genus: d.genus, species: d.species ?? d.canonicalName, rank: d.rank, status: d.taxonomicStatus, name: d.canonicalName })
async function lookup(key, countExtra = false) {
  if (taxo[key]) return taxo[key]
  if (countExtra && ++extra > DISTRACTOR_CAP) return null
  const d = await gbif(`/species/${key}`)
  taxo[key] = ranks(d)
  return taxo[key]
}
async function pool(items, fn) {
  const out = []; let i = 0
  await Promise.all(Array.from({ length: CONC }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); if (k % 50 === 49) store('gbif-taxonomy', taxo) } }))
  store('gbif-taxonomy', taxo)
  return out
}
/** "Plantae Tracheophyta Magnoliopsida Rosales Rosaceae Pyrus communis": the BioCLIP label, genus once, epithet after it. */
export const label = (t) => [t.kingdom, t.phylum, t.class, t.order, t.family, t.genus, (t.species ?? '').replace(new RegExp(`^${t.genus}\\s*`), '') || ''].filter(Boolean).join(' ')

// 1 · the set
const rows = set()
const setKeys = new Set(rows.map((r) => r.gbifKey))
await pool(rows, (r) => lookup(r.gbifKey))
const taxonomy = rows.map((r) => ({ ...r, ...taxo[r.gbifKey], label: label(taxo[r.gbifKey]) }))
const missing = taxonomy.filter((t) => !t.kingdom || !t.family || !t.genus)
writeFileSync(`${OUT}taxonomy.json`, JSON.stringify(taxonomy, null, 1))
console.log(`taxonomy.json: ${taxonomy.length} rows, ${missing.length} with a missing rank ${missing.map((m) => m.sciName).slice(0, 10).join(', ')}`)
console.log(`ranks other than SPECIES: ${taxonomy.filter((t) => t.rank !== 'SPECIES').map((t) => `${t.sciName} (${t.rank})`).join(', ') || 'none'}`)

// 2 · distractors, in two sources, both from GBIF occurrence facets (what people actually record), never typed by hand:
//   a) the genera the handoff names plus a few more pot, garden and crop genera: the 5 most-recorded species per genus worldwide
//   b) the most-recorded species in Germany (country=DE, kingdom Plantae then Animalia) that are not in the set
const GENERA = ['Malus', 'Prunus', 'Cucurbita', 'Ficus', 'Schefflera', 'Heptapleurum', 'Olea', 'Citrus', 'Pelargonium', 'Monstera', 'Dracaena', 'Hedera', 'Thuja', 'Solanum']
const distractors = new Map((cached('gbif-distractors') ?? []).map((d) => [String(d.gbifKey), d])) // key → row, kept across runs
const add = (key, t, source) => { if (t && !setKeys.has(Number(key)) && t.rank === 'SPECIES' && !distractors.has(key)) distractors.set(key, { gbifKey: Number(key), sciName: t.species, ...t, label: label(t), source }) }
for (const g of GENERA) {
  if (extra + 2 > DISTRACTOR_CAP) break
  if ([...distractors.values()].some((d) => d.source === `genus ${g}`)) continue // already pulled
  extra++; const m = await gbif(`/species/match?name=${g}&rank=GENUS&kingdom=Plantae`)
  if (!m.usageKey || m.rank !== 'GENUS') { console.log(`genus ${g}: no match (${m.matchType})`); continue }
  extra++; const f = await gbif(`/occurrence/search?genusKey=${m.usageKey}&facet=speciesKey&facetLimit=5&limit=0`)
  const keys = (f.facets?.[0]?.counts ?? []).map((c) => c.name)
  await pool(keys, async (k) => add(k, await lookup(k, true), `genus ${g}`))
  console.log(`genus ${g} (${m.usageKey}): ${keys.length} species, ${[...distractors.values()].filter((d) => d.source === `genus ${g}`).map((d) => d.sciName).join(', ')}`)
}
for (const [kingdomKey, want] of [[6, 60], [1, 30]]) {
  if (extra + 1 > DISTRACTOR_CAP) break
  if ([...distractors.values()].some((d) => d.source === `DE top kingdom ${kingdomKey}`)) continue
  extra++; const f = await gbif(`/occurrence/search?country=DE&kingdomKey=${kingdomKey}&facet=speciesKey&facetLimit=300&limit=0`)
  const keys = (f.facets?.[0]?.counts ?? []).map((c) => Number(c.name)).filter((k) => !setKeys.has(k)).slice(0, want)
  await pool(keys, async (k) => add(k, await lookup(k, true), `DE top kingdom ${kingdomKey}`))
  console.log(`DE kingdom ${kingdomKey}: ${keys.length} keys not in the set → ${[...distractors.values()].filter((d) => d.source === `DE top kingdom ${kingdomKey}`).length} distractors`)
}
const dist = [...distractors.values()]
store('gbif-distractors', dist); store('gbif-requests', { extra })
writeFileSync(`${OUT}distractors.json`, JSON.stringify(dist, null, 1))
console.log(`distractors.json: ${dist.length} rows, ${extra} GBIF requests beyond the set (cap ${DISTRACTOR_CAP})`)
