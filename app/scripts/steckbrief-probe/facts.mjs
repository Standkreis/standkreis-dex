// Step 4a of the Steckbrief grill: the fact sheet the prose editor writes from, for the ten species. Facts come from the
// DB (AnAge facts, IUCN, GloBI edges, month shares per region), the bulk datasets (.cache/joined.json), Wikidata
// (.cache/wikidata-props.json + labels) and GIFT. Never from Wikipedia. Each fact carries an id and a source.
// Run from app/: node scripts/steckbrief-probe/facts.mjs → facts.json
import pg from 'pg'
import { join } from 'node:path'
import { HERE, DEV_DB, get, cached, readJson, writeJson, norm } from './lib.mjs'

export const TEN = ['Turdus merula', 'Lycaena phlaeas', 'Amanita muscaria', 'Salamandra salamandra', 'Urtica dioica', 'Zoropsis spinimana', 'Grus grus', 'Lucanus cervus', 'Rana temporaria', 'Alnus glutinosa']
const { taxa } = readJson(join(HERE, 'taxa.json'))
const joined = cached('joined'), wd = cached('wikidata-props')
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

const client = new pg.Client({ connectionString: process.env.DATABASE_URL_DEV ?? DEV_DB })
await client.connect()
const ten = TEN.map((n) => taxa.find((t) => t.sciName === n))
const ids = ten.map((t) => t.id)
const { rows: edges } = await client.query('select i."sourceId", i.kind, t."sciName", t."commonNames" from "Interaction" i join "Taxon" t on t.id = i."targetId" where i."sourceId" = any($1)', [ids])
const { rows: plaus } = await client.query('select p."taxonId", r.name as region, p.obs, p."monthShare", p.peak, p.words from "Plausibility" p join "Region" r on r.id = p."regionId" where p."taxonId" = any($1)', [ids])
await client.end()

// Wikidata labels for the QIDs the fact sheet cites (food, habitat, edibility, spore print, ecological type, cap shape, IUCN).
const qids = new Set()
for (const t of ten) for (const p of ['P1034', 'P2974', 'P789', 'P787', 'P788', 'P784', 'P141']) for (const v of wd[t.wikidataId]?.[p] ?? []) if (v.includes('/entity/Q')) qids.add(v.split('/').pop())
const labels = {}
const list = [...qids]
for (let i = 0; i < list.length; i += 50) {
  const r = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${list.slice(i, i + 50).join('|')}&props=labels&languages=de|en&format=json`)
  for (const [q, e] of Object.entries(r.entities)) labels[q] = e.labels?.de?.value ?? e.labels?.en?.value ?? q
}
const label = (v) => (v.includes('/entity/Q') ? labels[v.split('/').pop()] ?? v : v)

const GIFT = readJson(join(HERE, 'gift.json'))
const giftFor = async (name) => {
  // gift.mjs kept only examples; re-read the trait caches (all on disk) for the two plants.
  const API = 'https://gift.uni-goettingen.de/api/extended/index.php?query='
  const species = await get(API + 'species')
  const id = species.find((s) => norm(s.work_species).split(' ').slice(0, 2).join(' ') === name)?.work_ID
  if (!id) return {}
  const T = { '1.6.2': 'height max (m)', '1.2.1': 'growth form', '2.1.1': 'lifecycle', '3.7.1': 'flowering start', '3.7.2': 'flowering end', '3.6.2': 'pollination', '3.3.1': 'dispersal', '6.3.1': 'habitat' }
  const out = {}
  for (const [tid, l] of Object.entries(T)) { const rows = await get(API + 'traits&traitid=' + tid); const hit = rows.find((r) => String(r.work_ID) === String(id)); if (hit) out[l] = hit.trait_value }
  return out
}

const sheets = {}
for (const t of ten) {
  const F = []
  const add = (source, text, url) => F.push({ id: `F${F.length + 1}`, source, text, ...(url ? { url } : {}) })
  add('GBIF', `Scientific name ${t.sciName}; rank ${t.rank}; class ${t.class ?? '?'}, order ${t.order ?? '?'}; tile ${t.tile}.`, `https://www.gbif.org/species/${t.gbifKey}`)
  if (t.commonNames?.de) add('Wikidata', `German name: ${t.commonNames.de}.`)
  if (t.commonNames?.en) add('Wikidata', `English name: ${t.commonNames.en}.`)
  if (t.iucn) add('IUCN Red List via Wikidata P141', `IUCN status: ${t.iucn}.`)
  for (const [k, f] of Object.entries(t.facts ?? {})) add(f.source, `${k}: ${f.value}.`, f.url)
  const j = joined[t.gbifKey] ?? {}
  if (j.avonet) { const a = j.avonet; add('AVONET (Tobias et al. 2022, CC BY 4.0)', `Body mass ${a.Mass} g; wing length ${a['Wing.Length']} mm; tail ${a['Tail.Length']} mm; beak (culmen) ${a['Beak.Length_Culmen']} mm; habitat ${a.Habitat} (density ${a['Habitat.Density']}: 1 dense, 3 open); migration ${a.Migration} (1 sedentary, 2 partial, 3 migratory); trophic niche ${a['Trophic.Niche']}; primary lifestyle ${a['Primary.Lifestyle']}.`) }
  if (j.eltonBird) { const e = j.eltonBird; add('EltonTraits (Wilman et al. 2014, CC0)', `Diet shares (%): invertebrates ${e['Diet-Inv']}, vertebrates ${+e['Diet-Vend'] + +e['Diet-Vect'] + +e['Diet-Vfish'] + +e['Diet-Vunk']}, scavenging ${e['Diet-Scav']}, fruit ${e['Diet-Fruit']}, nectar ${e['Diet-Nect']}, seeds ${e['Diet-Seed']}, other plant ${e['Diet-PlantO']}; dominant ${e['Diet-5Cat']}; foraging on the ground ${e['ForStrat-ground']} %, understory ${e['ForStrat-understory']} %, canopy ${e['ForStrat-canopy']} %; nocturnal ${e.Nocturnal === '1' ? 'yes' : 'no'}.`) }
  if (j.eltonMam) { const e = j.eltonMam; add('EltonTraits (CC0)', `Diet shares (%): invertebrates ${e['Diet-Inv']}, vertebrates ${e['Diet-Vend']}, fruit ${e['Diet-Fruit']}, seeds ${e['Diet-Seed']}, other plant ${e['Diet-PlantO']}; activity nocturnal ${e['Activity-Nocturnal']}, crepuscular ${e['Activity-Crepuscular']}, diurnal ${e['Activity-Diurnal']}.`) }
  if (j.pantheria) { const p = j.pantheria; const v = (k) => (p[k] && p[k] !== '-999' && p[k] !== '-999.00' ? p[k] : null); const parts = [v('5-1_AdultBodyMass_g') && `adult body mass ${v('5-1_AdultBodyMass_g')} g`, v('13-1_AdultHeadBodyLen_mm') && `head-body length ${v('13-1_AdultHeadBodyLen_mm')} mm`, v('17-1_MaxLongevity_m') && `max longevity ${(v('17-1_MaxLongevity_m') / 12).toFixed(1)} years`, v('15-1_LitterSize') && `litter size ${v('15-1_LitterSize')}`, v('9-1_GestationLen_d') && `gestation ${v('9-1_GestationLen_d')} days`].filter(Boolean); if (parts.length) add('PanTHERIA (Jones et al. 2009)', parts.join('; ') + '.') }
  if (j.amphibio) { const a = j.amphibio; const y = (k) => (a[k] && a[k] !== '' ? a[k] : null); const parts = [y('Body_size_mm') && `max body size ${a.Body_size_mm} mm`, y('Longevity_max_y') && `max longevity ${a.Longevity_max_y} years`, (y('Litter_size_min_n') || y('Litter_size_max_n')) && `clutch ${a.Litter_size_min_n || '?'}–${a.Litter_size_max_n || '?'} eggs`, y('Age_at_maturity_min_y') && `maturity from ${a.Age_at_maturity_min_y} years`, `habitat: ${['Fos', 'Ter', 'Aqu', 'Arb'].filter((k) => a[k] === '1').map((k) => ({ Fos: 'fossorial', Ter: 'terrestrial', Aqu: 'aquatic', Arb: 'arboreal' })[k]).join(', ') || 'unknown'}`, `activity: ${['Diu', 'Noc', 'Crepu'].filter((k) => a[k] === '1').map((k) => ({ Diu: 'diurnal', Noc: 'nocturnal', Crepu: 'crepuscular' })[k]).join(', ') || 'unknown'}`, `diet: ${['Arthro', 'Vert', 'Leaves', 'Seeds', 'Fruits', 'Flowers'].filter((k) => a[k] === '1').join(', ').toLowerCase() || 'unknown'}`, a.Viv === '1' ? 'viviparous/ovoviviparous' : a.Lar === '1' ? 'larval development' : a.Dir === '1' ? 'direct development' : null].filter(Boolean); add('AmphiBIO (Oliveira et al. 2017, CC BY 4.0)', parts.join('; ') + '.') }
  const w = wd[t.wikidataId] ?? {}
  const wdq = (p, l, unit = '') => { if (w[p]?.length) add('Wikidata', `${l}: ${w[p].map(label).join(', ')}${unit}.`, `https://www.wikidata.org/wiki/${t.wikidataId}`) }
  wdq('P2067', 'mass', ' (kg or g as entered, unit not returned)'); wdq('P2050', 'wingspan', ' (unit as entered: cm or m)'); wdq('P2043', 'length'); wdq('P2048', 'height')
  wdq('P1034', 'main food'); wdq('P2974', 'habitat'); wdq('P789', 'edibility'); wdq('P787', 'spore print colour'); wdq('P788', 'ecological type'); wdq('P784', 'cap shape')
  if (t.tile === 'plant') { const g = await giftFor(t.sciName); if (Object.keys(g).length) add('GIFT (Weigelt et al. 2020)', Object.entries(g).map(([k, v]) => `${k}: ${v}`).join('; ') + '.', 'https://gift.uni-goettingen.de') }
  const byKind = {}
  for (const e of edges.filter((e) => e.sourceId === t.id)) (byKind[e.kind] ??= []).push(e.commonNames?.de ? `${e.commonNames.de} (${e.sciName})` : e.sciName)
  for (const [k, names] of Object.entries(byKind)) add('GloBI', `${k}: ${names.slice(0, 12).join(', ')}${names.length > 12 ? ` and ${names.length - 12} more` : ''}.`, `https://www.globalbioticinteractions.org/?sourceTaxon=${encodeURIComponent(t.sciName)}`)
  for (const p of plaus.filter((p) => p.taxonId === t.id)) { const bars = p.monthShare.map((s, i) => `${MONTHS[i]} ${Math.round((100 * s) / p.peak)}`).join(', '); add('GBIF occurrences', `Region ${p.region}: ${p.obs} observations in ten years; main time "${p.words}"; month profile as % of the peak month: ${bars}.`) }
  sheets[t.sciName] = { gbifKey: t.gbifKey, tile: t.tile, names: t.commonNames, regions: t.regions, facts: F }
  console.log(`${t.sciName}: ${F.length} facts`)
}
writeJson(join(HERE, 'facts.json'), sheets)
