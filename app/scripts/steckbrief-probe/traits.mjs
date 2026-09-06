// Step 2 of the Steckbrief grill (handoff 0019 S1): the bulk trait datasets joined to the 1 869 set taxa by scientific
// name (GBIF synonyms where the join fails, vertebrates only), Wikidata properties in batches of 50 QIDs, GBIF vernacular
// names on a sample. Downloads land once in .cache/ (git-ignored). Run from app/: node scripts/steckbrief-probe/traits.mjs
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { HERE, CACHE, get, cachePath, cached, store, readJson, writeJson, table, norm, md, pct, requests } from './lib.mjs'

const { taxa } = readJson(join(HERE, 'taxa.json'))
const TILES = [...new Set(taxa.map((t) => t.tile))].sort((a, b) => taxa.filter((t) => t.tile === b).length - taxa.filter((t) => t.tile === a).length)
const nTile = Object.fromEntries(TILES.map((k) => [k, taxa.filter((t) => t.tile === k).length]))
const binomial = (s) => norm(s).split(' ').slice(0, 2).join(' ')

// ── 1. Downloads, once ───────────────────────────────────────────────────────────────────────────────────────────────
const SOURCES = {
  avonet: { url: 'https://ndownloader.figshare.com/files/38429873', file: 'ELEData.zip', unzip: 'ELEData/TraitData/AVONET1_BirdLife.csv', out: 'AVONET1_BirdLife.csv', licence: 'CC BY 4.0', cite: 'Tobias et al. 2022, Ecol. Lett., figshare 16586228' },
  eltonBird: { url: 'https://ndownloader.figshare.com/files/5631081', file: 'BirdFuncDat.txt', licence: 'CC0 (figshare 3559887)', cite: 'Wilman et al. 2014, Ecology' },
  eltonMam: { url: 'https://ndownloader.figshare.com/files/5631084', file: 'MamFuncDat.txt', licence: 'CC0 (figshare 3559887)', cite: 'Wilman et al. 2014, Ecology' },
  pantheria: { url: 'https://ndownloader.figshare.com/files/5604752', file: 'pantheria.zip', unzip: 'PanTHERIA_1-0_WR05_Aug2008.txt', out: 'PanTHERIA_1-0_WR05_Aug2008.txt', licence: 'ESA data paper, no explicit licence on the archive (figshare: CC BY 4.0 via Wiley)', cite: 'Jones et al. 2009, Ecology E090-184' },
  amphibio: { url: 'https://ndownloader.figshare.com/files/8828578', file: 'amphibio.zip', unzip: 'AmphiBIO_v1.csv', out: 'AmphiBIO_v1.csv', licence: 'CC BY 4.0', cite: 'Oliveira et al. 2017, Sci. Data, figshare 4644424' },
}
for (const [k, s] of Object.entries(SOURCES)) {
  const p = await get(s.url, { file: s.file })
  if (s.unzip && !existsSync(cachePath(s.out))) execSync(`unzip -o -q -j "${p}" "${s.unzip}" -d "${CACHE}"`)
  s.path = cachePath(s.out ?? s.file)
  s.bytes = readFileSync(s.path).length
  console.log(`${k}: ${(s.bytes / 1e6).toFixed(1)} MB`)
}
const csv = (p, sep = ',') => table(readFileSync(p, 'latin1'), sep)
const avonet = csv(SOURCES.avonet.path)
const eltonBird = csv(SOURCES.eltonBird.path, '\t')
const eltonMam = csv(SOURCES.eltonMam.path, '\t')
const pantheria = csv(SOURCES.pantheria.path, '\t')
const amphibio = csv(SOURCES.amphibio.path)
const index = (rows, key) => new Map(rows.map((r) => [binomial(r[key]), r]))
const IDX = {
  avonet: index(avonet, 'Species1'),
  eltonBird: index(eltonBird, 'Scientific'),
  eltonMam: index(eltonMam, 'Scientific'),
  pantheria: index(pantheria, 'MSW05_Binomial'),
  amphibio: index(amphibio, 'Species'),
}
console.log(Object.entries(IDX).map(([k, m]) => `${k} ${m.size} names`).join(' · '))

// ── 2. Join, with GBIF synonyms for the vertebrate misses ────────────────────────────────────────────────────────────
const miss = (v) => v === '' || v === 'NA' || v === '-999' || v === '-999.00' || v === undefined
const FIELDS = {
  // name → [dataset, column(s), test]. A field counts when at least one column carries a value.
  'mass (g)': { avonet: ['Mass'], eltonBird: ['BodyMass-Value'], eltonMam: ['BodyMass-Value'], pantheria: ['5-1_AdultBodyMass_g'], amphibio: ['Body_mass_g'] },
  'length / wing (mm)': { avonet: ['Wing.Length'], pantheria: ['13-1_AdultHeadBodyLen_mm'], amphibio: ['Body_size_mm'] },
  habitat: { avonet: ['Habitat'], pantheria: ['12-1_HabitatBreadth'], amphibio: ['Fos', 'Ter', 'Aqu', 'Arb'] },
  migration: { avonet: ['Migration'] },
  'diet / trophic niche': { avonet: ['Trophic.Niche'], eltonBird: ['Diet-5Cat'], eltonMam: ['Diet-Inv', 'Diet-Vend', 'Diet-Fruit', 'Diet-Seed', 'Diet-PlantO'], amphibio: ['Arthro', 'Vert', 'Leaves', 'Seeds', 'Fruits', 'Flowers'] },
  'activity (day/night)': { eltonBird: ['Nocturnal'], eltonMam: ['Activity-Nocturnal', 'Activity-Diurnal', 'Activity-Crepuscular'], pantheria: ['1-1_ActivityCycle'], amphibio: ['Diu', 'Noc', 'Crepu'] },
  'longevity': { pantheria: ['17-1_MaxLongevity_m'], amphibio: ['Longevity_max_y'] },
  'litter / clutch': { pantheria: ['15-1_LitterSize'], amphibio: ['Litter_size_min_n', 'Litter_size_max_n'] },
  'maturity': { pantheria: ['23-1_SexualMaturityAge_d'], amphibio: ['Age_at_maturity_min_y', 'Age_at_maturity_max_y'] },
}
const hit = (row, cols) => !!row && cols.some((c) => !miss(row[c]))

async function synonymsOf(gbifKey) {
  const r = await get(`https://api.gbif.org/v1/species/${gbifKey}/synonyms?limit=50`)
  return (r.results ?? []).map((s) => binomial(s.canonicalName ?? s.scientificName)).filter(Boolean)
}
const joined = {}
let synCalls = 0
for (const t of taxa) {
  const name = binomial(t.sciName)
  const rowFor = {}
  for (const [k, m] of Object.entries(IDX)) rowFor[k] = m.get(name) ?? null
  const relevant = t.tile === 'bird' ? ['avonet', 'eltonBird'] : t.tile === 'mammal' ? ['eltonMam', 'pantheria'] : t.tile === 'amphibian' ? ['amphibio'] : []
  if (relevant.length && relevant.some((k) => !rowFor[k]) && synCalls < 200) {
    synCalls++
    for (const syn of await synonymsOf(t.gbifKey)) for (const k of relevant) if (!rowFor[k]) rowFor[k] = IDX[k].get(syn) ?? null
    if (relevant.some((k) => !rowFor[k])) console.log(`  join miss ${t.tile} ${name}: ${relevant.filter((k) => !rowFor[k]).join(',')}`)
  }
  joined[t.gbifKey] = rowFor
}

store('joined', joined)

// ── 3. Wikidata, 50 QIDs per SPARQL query ────────────────────────────────────────────────────────────────────────────
const WD_PROPS = {
  P2043: 'length', P2067: 'mass', P2048: 'height', P2050: 'wingspan', P1034: 'main food', P2974: 'habitat', P183: 'endemic to',
  P789: 'edibility (fungi)', P787: 'spore print (fungi)', P788: 'ecological type (fungi)', P784: 'cap shape (fungi)',
  P141: 'IUCN status', P2426: 'xeno-canto id', P4024: 'AnAge id', P830: 'EOL id', P3151: 'iNat id', P1843: 'vernacular name', P18: 'image',
}
const qids = taxa.filter((t) => t.wikidataId).map((t) => t.wikidataId)
const wd = {}
for (let i = 0; i < qids.length; i += 50) {
  const batch = qids.slice(i, i + 50)
  const q = `SELECT ?item ?p ?v (LANG(?v) AS ?l) WHERE { VALUES ?item { ${batch.map((q) => `wd:${q}`).join(' ')} } VALUES ?p { ${Object.keys(WD_PROPS).map((p) => `wdt:${p}`).join(' ')} } ?item ?p ?v }`
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`
  const r = await get(url, { headers: { accept: 'application/sparql-results+json' } })
  for (const b of r.results.bindings) {
    const qid = b.item.value.split('/').pop(), p = b.p.value.split('/').pop()
    const rec = (wd[qid] ??= {})
    ;(rec[p] ??= []).push(b.l?.value ? `${b.l.value}:${b.v.value}` : b.v.value)
  }
  if ((i / 50) % 10 === 0) console.log(`  wikidata ${Math.min(i + 50, qids.length)}/${qids.length}`)
}
store('wikidata-props', wd)

// ── 4. GBIF vernacular names, sample ≤ 900 keys ──────────────────────────────────────────────────────────────────────
const small = taxa.filter((t) => !['plant', 'insect'].includes(t.tile))
const sample = (arr, n) => arr.filter((_, i) => i % Math.ceil(arr.length / n) === 0).slice(0, n)
const vernSample = [...small, ...sample(taxa.filter((t) => t.tile === 'plant'), 260), ...sample(taxa.filter((t) => t.tile === 'insect'), 260)]
const vern = {}
for (const t of vernSample) {
  const r = await get(`https://api.gbif.org/v1/species/${t.gbifKey}/vernacularNames?limit=200`)
  const langs = new Set((r.results ?? []).map((v) => v.language))
  vern[t.gbifKey] = { de: langs.has('deu'), en: langs.has('eng'), n: r.results?.length ?? 0 }
}

// ── 5. Coverage table per field per tile ─────────────────────────────────────────────────────────────────────────────
const rows = []
const cover = (label, test, subset = taxa) => {
  const per = TILES.map((tile) => { const s = subset.filter((t) => t.tile === tile); const n = s.filter(test).length; return s.length ? `${pct(n, s.length)}` : '·' })
  const all = subset.filter(test).length
  rows.push([label, ...per, `${pct(all, subset.length)} (${all})`])
  return all
}
rows.push(['**taxa**', ...TILES.map((k) => nTile[k]), taxa.length])
rows.push([`**bulk datasets**`, ...TILES.map(() => ''), ''])
for (const [label, spec] of Object.entries(FIELDS)) cover(label, (t) => Object.entries(spec).some(([ds, cols]) => hit(joined[t.gbifKey][ds], cols)))
rows.push([`**per dataset, any row**`, ...TILES.map(() => ''), ''])
for (const ds of Object.keys(IDX)) cover(ds, (t) => !!joined[t.gbifKey][ds])
rows.push([`**Wikidata**`, ...TILES.map(() => ''), ''])
for (const [p, label] of Object.entries(WD_PROPS)) {
  const test = (t) => !!(t.wikidataId && wd[t.wikidataId]?.[p]?.length)
  if (p === 'P1843') { cover('vernacular de (P1843)', (t) => !!(t.wikidataId && wd[t.wikidataId]?.[p]?.some((x) => x.startsWith('de:')))); cover('vernacular en (P1843)', (t) => !!(t.wikidataId && wd[t.wikidataId]?.[p]?.some((x) => x.startsWith('en:')))); continue }
  cover(`${label} (${p})`, test)
}
rows.push([`**GBIF vernacular** (sample ${vernSample.length})`, ...TILES.map(() => ''), ''])
cover('de name in GBIF', (t) => !!vern[t.gbifKey]?.de, vernSample)
cover('en name in GBIF', (t) => !!vern[t.gbifKey]?.en, vernSample)
rows.push([`**in the DB today**`, ...TILES.map(() => ''), ''])
cover('de name (dewiki)', (t) => !!t.commonNames?.de)
cover('en name', (t) => !!t.commonNames?.en)
cover('any fact (AnAge)', (t) => !!t.facts)
rows.push([`**union: any size fact** (mass, length, wingspan, height from any source)`, ...TILES.map(() => ''), ''])
cover('size from bulk or Wikidata', (t) => ['mass (g)', 'length / wing (mm)'].some((f) => Object.entries(FIELDS[f]).some(([ds, cols]) => hit(joined[t.gbifKey][ds], cols))) || ['P2043', 'P2067', 'P2048', 'P2050'].some((p) => t.wikidataId && wd[t.wikidataId]?.[p]?.length))

const out = md(['field', ...TILES, 'all'], rows)
console.log(out)
writeJson(join(HERE, 'coverage.json'), { at: new Date().toISOString(), sources: SOURCES, tiles: nTile, rows, requests: requests(), synCalls })

writeFileSync(join(HERE, 'coverage.md'), out + '\n')
console.log('requests', JSON.stringify(requests()), 'synonym calls', synCalls)

// Examples for the findings: a few Wikidata values and a few joined rows.
const ex = (name) => { const t = taxa.find((x) => x.sciName === name); if (!t) return; console.log(name, JSON.stringify({ wd: wd[t.wikidataId], av: joined[t.gbifKey].avonet && { mass: joined[t.gbifKey].avonet.Mass, wing: joined[t.gbifKey].avonet['Wing.Length'], hab: joined[t.gbifKey].avonet.Habitat, mig: joined[t.gbifKey].avonet.Migration, niche: joined[t.gbifKey].avonet['Trophic.Niche'] }, elton: joined[t.gbifKey].eltonBird?.['Diet-5Cat'] ?? joined[t.gbifKey].eltonMam?.['Activity-Nocturnal'], pan: joined[t.gbifKey].pantheria && { mass: joined[t.gbifKey].pantheria['5-1_AdultBodyMass_g'], len: joined[t.gbifKey].pantheria['13-1_AdultHeadBodyLen_mm'], long: joined[t.gbifKey].pantheria['17-1_MaxLongevity_m'] }, amph: joined[t.gbifKey].amphibio && { size: joined[t.gbifKey].amphibio.Body_size_mm, long: joined[t.gbifKey].amphibio.Longevity_max_y } })) }
for (const n of ['Turdus merula', 'Grus grus', 'Salamandra salamandra', 'Rana temporaria', 'Amanita muscaria', 'Urtica dioica', 'Lucanus cervus', 'Zoropsis spinimana', 'Sciurus vulgaris', 'Alnus glutinosa']) ex(n)
