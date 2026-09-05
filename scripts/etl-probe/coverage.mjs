// E8 text and facts · E9 interactions · E10 look-alikes. Wikipedia (de, en), AnAge, EOL, GloBI, GBIF backbone.
// node coverage.mjs --region Mainz-Bingen --month 9 --threshold 10
import { arg, get, load, pool, q, requests, save, table, wikidataForGbif } from './lib.mjs'

const region = arg('region', 'Mainz-Bingen'), month = Number(arg('month', 9)), t = Number(arg('threshold', 10))
const list = load(`year-${region.toLowerCase()}.json`).list // E2 set
// EOL and GloBI need 2 calls per species; sample 60 per tile for those, Wikipedia and Wikidata run on everything
const sampled = new Set(); for (const g of new Set(list.map((r) => r.group))) list.filter((r) => r.group === g).sort(() => Math.random() - 0.5).slice(0, 60).forEach((r) => sampled.add(r.key))
const log = (...a) => console.log(...a, '\n')
log(`# 🔬 coverage.mjs · ${region} · whole-year set → ${list.length} species · EOL/GloBI/siblings sampled ${sampled.size}`)
const wd = await wikidataForGbif(list.map((r) => String(r.key)))

// AnAge: one public build file, no API. Downloaded once, matched by genus+species.
let anage = new Set()
// Practical AnAge proxy: Wikidata P4024 (AnAge ID) exists on items that AnAge covers.
async function anageIds(qids) {
  const has = new Set()
  for (let i = 0; i < qids.length; i += 150) {
    const j = await get(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(`SELECT ?item WHERE { VALUES ?item { ${qids.slice(i, i + 150).map((x) => `wd:${x}`).join(' ')} } ?item wdt:P4024 ?a }`)}`)
    for (const b of j.results.bindings) has.add(b.item.value.split('/').pop())
  }
  return has
}
anage = await anageIds(list.map((r) => wd[r.key]?.qid).filter(Boolean))

const c = { sampled: 0, dewiki: 0, deIntro: 0, enwiki: 0, enIntro: 0, iucn: 0, anage: 0, eolPage: 0, eolHabitat: 0, globiAny: 0, globiZero: 0, lookalike: 0 }
const kinds = {}, edges = [], noEdge = [], lookalikes = [], tileZero = {}, tileN = {}
await pool(list, 3, async (r) => {
  const w = wd[r.key] ?? {}
  if (w.dewiki) { c.dewiki++; const s = await get(`https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(decodeURIComponent(w.dewiki.split('/').pop()))}`); if (s?.extract?.length > 80) c.deIntro++ }
  if (w.enwiki) { c.enwiki++; const s = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(decodeURIComponent(w.enwiki.split('/').pop()))}`); if (s?.extract?.length > 80) c.enIntro++ }
  if (w.iucn) c.iucn++
  if (anage.has(w.qid)) c.anage++
  if (!sampled.has(r.key)) return
  c.sampled++
  // EOL dropped in E8 (TraitBank needs a key; public pages API returns no traits; 429s at 3 in flight)
  // GloBI: interaction counts by type, both directions
  const g = await get(`https://api.globalbioticinteractions.org/interaction?${q({ sourceTaxon: r.sci, type: 'json.v2', limit: 500 })}`)
  const g2 = await get(`https://api.globalbioticinteractions.org/interaction?${q({ targetTaxon: r.sci, type: 'json.v2', limit: 500 })}`)
  const all = [...(g ?? []), ...(g2 ?? [])]
  if (all.length) { c.globiAny++; for (const e of all) kinds[e.interaction_type] = (kinds[e.interaction_type] ?? 0) + 1; edges.push([r.de || r.sci, all.length]) } else { c.globiZero++; noEdge.push(r.de || r.sci); tileZero[r.group] = (tileZero[r.group] ?? 0) + 1 }
  tileN[r.group] = (tileN[r.group] ?? 0) + 1
  // look-alikes: same genus in GBIF backbone, accepted species only
  const genus = r.sci.split(' ')[0]
  const sib = await get(`https://api.gbif.org/v1/species/search?${q({ q: genus, rank: 'SPECIES', status: 'ACCEPTED', datasetKey: 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c', limit: 50 })}`)
  const sibs = (sib?.results ?? []).filter((s) => s.genus === genus && s.canonicalName !== r.sci)
  if (sibs.length) { c.lookalike++; lookalikes.push([r.de || r.sci, sibs.length, sibs.slice(0, 4).map((s) => s.canonicalName).join(', ')]) }
})
log('## E8 · coverage per source\n')
const denom = (k) => ['dewiki', 'deIntro', 'enwiki', 'enIntro', 'iucn', 'anage'].includes(k) ? list.length : c.sampled
log(table(['source', 'species', 'share', 'of'], Object.entries(c).map(([k, v]) => [k, v, `${((100 * v) / denom(k)).toFixed(0)}%`, denom(k)])))
log('## E9 · GloBI interactions\n')
log(table(['kind', 'edges'], Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 15)))
log(`Zero edges (honest empty state): ${c.globiZero}/${c.sampled} — ${noEdge.slice(0, 15).join(', ')}${noEdge.length > 15 ? ' …' : ''}`)
log('Zero-edge share per tile: ' + Object.entries(tileN).map(([g, n]) => `${g} ${tileZero[g] ?? 0}/${n}`).join(' · '))
log('Most connected:\n\n' + table(['Art', 'edges'], edges.sort((a, b) => b[1] - a[1]).slice(0, 10)))
log('## E10 · look-alikes = same genus in the GBIF backbone\n')
log(`${c.lookalike}/${c.sampled} species have ≥1 sibling. Spot checks:\n\n` + table(['Art', 'siblings (global)', 'examples'], lookalikes.sort((a, b) => b[1] - a[1]).slice(0, 12)))
log('Note: siblings are global, not regional. Regional look-alikes = siblings ∩ the plausible set, which the ETL can compute for free.')
save(`coverage-${region.toLowerCase()}-m${month}.json`, { threshold: t, coverage: c, kinds, noEdge, lookalikes })
log(`requests: ${JSON.stringify(requests())}`)
