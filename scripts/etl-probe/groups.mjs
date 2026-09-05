// E5 groups · E6 rank and matching. Reads out/cells-<region>-m<month>.json, talks to the GBIF backbone + Wikidata.
// node groups.mjs --region Mainz-Bingen --month 9 --threshold 10
import { arg, gbifSpecies, get, load, pool, q, requests, save, table, wikidataForGbif } from './lib.mjs'

const region = arg('region', 'Mainz-Bingen'), month = Number(arg('month', 9)), t = Number(arg('threshold', 10))
const cells = load(`cells-${region.toLowerCase()}-m${month}.json`)
const year = load(`year-${region.toLowerCase()}.json`)
const list = year.list // the E2 set: whole year, 90 % per tile, floor 10
const log = (...a) => console.log(...a, '\n')
log(`# 🔬 groups.mjs · ${region} · whole-year set → ${list.length} species`)

// ── E5 · seven tiles from GBIF ranks ───────────────────────────────────────
// tile ← rank test, in order. Everything unmatched is "rest".
const TILES = [
  ['🐦 Vögel', (s) => s.class === 'Aves'],
  ['🦌 Säugetiere', (s) => s.class === 'Mammalia'],
  ['🦋 Insekten', (s) => s.class === 'Insecta'],
  ['🐸 Amphibien', (s) => s.class === 'Amphibia'],
  ['🦎 Reptilien', (s) => ['Squamata', 'Testudines', 'Reptilia', 'Crocodylia'].includes(s.class)],
  ['🌿 Pflanzen', (s) => s.kingdom === 'Plantae'],
  ['🍄 Pilze', (s) => s.kingdom === 'Fungi'],
]
const full = {}
await pool(list, 6, async (r) => { full[r.key] = await gbifSpecies(r.key) })
const tileOf = (s) => TILES.find(([, f]) => f(s))?.[0] ?? '❔ rest'
const byTile = {}, rest = {}
for (const r of list) {
  const s = full[r.key]; const tile = tileOf(s)
  byTile[tile] = (byTile[tile] ?? 0) + 1
  if (tile === '❔ rest') { const k = `${s.kingdom} › ${s.phylum ?? '?'} › ${s.class ?? '?'}`; rest[k] = (rest[k] ?? []); rest[k].push(r.de || r.sci) }
}
log('## E5 · tiles\n')
log(table(['tile', 'species', 'share'], [...TILES.map(([n]) => n), '❔ rest'].map((n) => [n, byTile[n] ?? 0, `${((100 * (byTile[n] ?? 0)) / list.length).toFixed(0)}%`])))
log('Species that fit no tile:\n\n' + table(['kingdom › phylum › class', 'n', 'examples'], Object.entries(rest).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => [k, v.length, v.slice(0, 6).join(', ')])))

// ── E6 · rank and matching ────────────────────────────────────────────────
log('## E6 · rank, subspecies, Wikidata match\n')
// what rank do the facet keys have? (speciesKey facet folds subspecies already, check by taxonKey facet)
const taxonFacet = await get(`https://api.gbif.org/v1/occurrence/search?${q({ gadmGid: cells.resolved.gadmGid, year: cells.years, hasCoordinate: true, basisOfRecord: ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'OCCURRENCE'], limit: 0, facet: 'taxonKey', facetLimit: 10000 })}`)
const tk = taxonFacet.facets[0].counts
const speciesKeys = new Set(year.counts.map((c) => c.name))
const taxa = tk.filter((c) => c.count >= t)
const nonSpecies = taxa.filter((c) => !speciesKeys.has(c.name)) // identified above or below species level
const ranks = {}
await pool(nonSpecies.slice(0, 300), 6, async (c) => { const s = await gbifSpecies(c.name); const r = s?.rank ?? '?'; ranks[r] = (ranks[r] ?? 0) + 1 })
log(`taxonKey facet ≥${t}: ${taxa.length} taxa, of which ${taxa.length - nonSpecies.length} are species keys and ${nonSpecies.length} are not. Ranks of the non-species (first 300):\n\n` + table(['rank', 'taxa'], Object.entries(ranks).sort((a, b) => b[1] - a[1])))
log(`The speciesKey facet already folds subspecies, varieties and forms into their species; genus-level and higher records have no speciesKey and drop out.`)

const wd = await wikidataForGbif(list.map((r) => String(r.key)))
const m = { qid: 0, de: 0, en: 0, img: 0, dewiki: 0, enwiki: 0, multi: 0, notSpecies: 0 }
const miss = [], notSp = []
for (const r of list) {
  const w = wd[r.key]
  if (!w) { miss.push(r.sci); continue }
  m.qid++; if (w.de) m.de++; if (w.en) m.en++; if (w.img) m.img++; if (w.dewiki) m.dewiki++; if (w.enwiki) m.enwiki++; if (w.multi) m.multi++
  if (w.rank && w.rank !== 'species') { m.notSpecies++; notSp.push(`${r.sci} → ${w.rank}`) }
}
// fallback: match the missing by scientific name
let byName = 0
for (const sci of miss) {
  const j = await get(`https://www.wikidata.org/w/api.php?${q({ action: 'wbsearchentities', search: sci, language: 'en', format: 'json', limit: 1 })}`)
  if (j?.search?.length) byName++
}
log(table(['Wikidata via P846 (GBIF key)', 'n', 'share'], Object.entries(m).map(([k, v]) => [k, v, `${((100 * v) / list.length).toFixed(0)}%`])))
log(`No P846 match: ${miss.length} (${miss.slice(0, 10).join(', ')}${miss.length > 10 ? ' …' : ''}); of those, ${byName} found by scientific-name search.`)
log(`Wikidata item is not rank species (doubt 8): ${notSp.length} — ${notSp.slice(0, 8).join('; ')}`)
save(`groups-${region.toLowerCase()}-m${month}.json`, { threshold: t, byTile, rest, ranks, wikidata: m, miss, notSpecies: notSp })
log(`requests: ${JSON.stringify(requests())}`)
