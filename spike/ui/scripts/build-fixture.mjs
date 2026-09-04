// Throwaway fixture builder. Authored: species list, group, months, interactions, dex state.
// Fetched: Wikidata (GBIF key, de/en label, IUCN, P18 image, dewiki title), Commons (thumb + attribution), de.wikipedia (intro).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))

const UA = 'standkreis-dex-ui-spike/0.1 (svreiser@gmail.com)'
const H = { 'User-Agent': UA, Accept: 'application/json' }

// months: 12 numbers 0–3, relative chance of meeting it in Rheinland-Pfalz. Sept index 8.
// ix: [kind, target sci name]; inverses are added automatically.
const S = [
  // 🐦 birds
  { sci: 'Turdus merula', group: 'bird', months: [3,3,3,3,3,3,3,3,3,3,3,3], state: 'both', userPhoto: true,
    ix: [['eats','Sambucus nigra'],['eats','Hedera helix'],['eats','Rubus fruticosus'],['eats','Crataegus monogyna'],['eatenBy','Vulpes vulpes']] },
  { sci: 'Erithacus rubecula', group: 'bird', months: [3,3,3,3,3,2,2,2,2,3,3,3], state: 'both',
    ix: [['eats','Sambucus nigra'],['eats','Hedera helix']] },
  { sci: 'Parus major', group: 'bird', months: [3,3,3,3,3,3,3,3,2,3,3,3], state: 'seen',
    ix: [['eats','Aglais urticae'],['eats','Fagus sylvatica'],['eats','Corylus avellana']] },
  { sci: 'Cyanistes caeruleus', group: 'bird', months: [3,3,3,3,3,3,3,3,2,3,3,3], state: 'silhouette',
    ix: [['eats','Aglais io'],['eats','Fagus sylvatica']] },
  { sci: 'Fringilla coelebs', group: 'bird', months: [3,3,3,3,3,3,3,3,2,3,3,3], state: 'silhouette',
    ix: [['eats','Fagus sylvatica'],['eats','Taraxacum officinale']] },
  { sci: 'Milvus milvus', group: 'bird', months: [1,2,3,3,3,3,3,3,3,2,1,1], state: 'studied',
    ix: [['eats','Lepus europaeus'],['eats','Bufo bufo'],['eats','Rana temporaria']] },
  { sci: 'Buteo buteo', group: 'bird', months: [3,3,3,3,3,3,3,3,2,3,3,3], state: 'studied',
    ix: [['eats','Rana temporaria'],['eats','Lacerta agilis'],['eats','Natrix natrix'],['eats','Lepus europaeus']] },
  { sci: 'Garrulus glandarius', group: 'bird', months: [2,2,2,2,2,2,2,2,3,3,3,2], state: 'silhouette',
    ix: [['eats','Quercus robur'],['eats','Corylus avellana'],['eats','Fagus sylvatica']] },
  { sci: 'Dendrocopos major', group: 'bird', months: [3,3,3,3,3,2,2,2,2,3,3,3], state: 'silhouette',
    ix: [['eats','Fagus sylvatica'],['eats','Corylus avellana']] },
  { sci: 'Corvus corone', group: 'bird', months: [3,3,3,3,3,3,3,3,2,3,3,3], state: 'silhouette',
    ix: [['eats','Quercus robur'],['eats','Rana temporaria'],['eats','Erinaceus europaeus']] },
  { sci: 'Ardea cinerea', group: 'bird', months: [2,2,3,3,3,3,3,3,2,3,2,2], state: 'studied',
    ix: [['eats','Rana temporaria'],['eats','Bufo bufo'],['eats','Natrix natrix']] },
  // 🦌 mammals
  { sci: 'Capreolus capreolus', group: 'mammal', months: [2,2,2,3,3,3,2,2,2,3,2,2], state: 'silhouette',
    ix: [['eats','Rubus fruticosus'],['eats','Hedera helix'],['eats','Fagus sylvatica'],['eats','Crataegus monogyna']] },
  { sci: 'Sciurus vulgaris', group: 'mammal', months: [2,2,3,3,3,2,2,2,3,3,3,2], state: 'seen',
    ix: [['eats','Corylus avellana'],['eats','Quercus robur'],['eats','Fagus sylvatica'],['eats','Boletus edulis'],['eats','Amanita muscaria']] },
  { sci: 'Vulpes vulpes', group: 'mammal', months: [2,2,2,2,2,2,2,2,2,2,2,2], state: 'silhouette',
    ix: [['eats','Lepus europaeus'],['eats','Rana temporaria'],['eats','Rubus fruticosus'],['eats','Erinaceus europaeus']] },
  { sci: 'Erinaceus europaeus', group: 'mammal', months: [0,0,1,2,3,3,3,3,3,2,1,0], state: 'silhouette',
    ix: [['eats','Lacerta agilis'],['eats','Rana temporaria']] },
  { sci: 'Sus scrofa', group: 'mammal', months: [2,2,2,2,2,2,2,2,2,3,3,2], state: 'silhouette',
    ix: [['eats','Quercus robur'],['eats','Fagus sylvatica'],['eats','Boletus edulis'],['eats','Amanita muscaria'],['eats','Rana temporaria']] },
  { sci: 'Lepus europaeus', group: 'mammal', months: [2,3,3,3,2,2,2,2,2,2,2,2], state: 'silhouette',
    ix: [['eats','Taraxacum officinale'],['eats','Rubus fruticosus']] },
  // 🦋 insects
  { sci: 'Vanessa atalanta', group: 'insect', months: [0,0,0,1,2,2,3,3,3,2,1,0], state: 'seen', userPhoto: true,
    ix: [['eats','Urtica dioica'],['visitsFlowersOf','Hedera helix'],['visitsFlowersOf','Rubus fruticosus'],['eats','Rubus fruticosus']] },
  { sci: 'Aglais io', group: 'insect', months: [0,0,1,2,2,2,3,3,2,2,0,0], state: 'studied',
    ix: [['eats','Urtica dioica'],['visitsFlowersOf','Centaurea jacea'],['visitsFlowersOf','Rubus fruticosus']] },
  { sci: 'Aglais urticae', group: 'insect', months: [0,0,1,2,2,2,3,3,2,2,0,0], state: 'silhouette',
    ix: [['eats','Urtica dioica'],['visitsFlowersOf','Centaurea jacea']] },
  { sci: 'Polygonia c-album', group: 'insect', months: [0,0,1,2,2,2,3,3,3,2,0,0], state: 'silhouette',
    ix: [['eats','Urtica dioica'],['eats','Corylus avellana'],['visitsFlowersOf','Hedera helix'],['visitsFlowersOf','Rubus fruticosus']] },
  { sci: 'Apis mellifera', group: 'insect', months: [0,0,1,2,3,3,3,3,2,2,0,0], state: 'silhouette',
    ix: [['pollinates','Rubus fruticosus'],['pollinates','Crataegus monogyna'],['pollinates','Centaurea jacea'],['pollinates','Hedera helix'],['pollinates','Taraxacum officinale']] },
  { sci: 'Bombus terrestris', group: 'insect', months: [0,0,1,2,3,3,3,3,2,2,0,0], state: 'silhouette',
    ix: [['pollinates','Rubus fruticosus'],['pollinates','Centaurea jacea'],['pollinates','Taraxacum officinale'],['pollinates','Crataegus monogyna']] },
  { sci: 'Vespa crabro', group: 'insect', months: [0,0,0,1,2,2,3,3,3,2,0,0], state: 'studied',
    ix: [['eats','Apis mellifera'],['eats','Vespula vulgaris'],['visitsFlowersOf','Hedera helix']] },
  { sci: 'Vespula vulgaris', group: 'insect', months: [0,0,0,1,2,2,3,3,3,2,1,0], state: 'silhouette',
    ix: [['visitsFlowersOf','Hedera helix'],['eats','Rubus fruticosus']] },
  { sci: 'Coccinella septempunctata', group: 'insect', months: [0,0,1,2,3,3,3,3,2,2,1,0], state: 'silhouette',
    ix: [['visitsFlowersOf','Taraxacum officinale'],['eatenBy','Lacerta agilis'],['eatenBy','Bufo bufo']] },
  { sci: 'Tettigonia viridissima', group: 'insect', months: [0,0,0,0,0,1,2,3,3,2,0,0], state: 'silhouette',
    ix: [['eats','Aglais io'],['eatenBy','Lacerta agilis'],['eatenBy','Garrulus glandarius']] },
  // 🌿 plants
  { sci: 'Rubus fruticosus', group: 'plant', months: [1,1,1,1,2,3,3,3,3,2,1,1], state: 'seen', ix: [] },
  { sci: 'Urtica dioica', group: 'plant', months: [0,0,1,2,3,3,3,3,2,2,1,0], state: 'both',
    ix: [['hostOf','Aglais io'],['hostOf','Aglais urticae'],['hostOf','Vanessa atalanta'],['hostOf','Polygonia c-album']] },
  { sci: 'Quercus robur', group: 'plant', months: [2,2,2,2,3,3,3,3,3,3,2,2], state: 'studied', ix: [] },
  { sci: 'Fagus sylvatica', group: 'plant', months: [2,2,2,2,3,3,3,3,3,3,2,2], state: 'studied',
    ix: [['hostOf','Fomes fomentarius']] },
  { sci: 'Hedera helix', group: 'plant', months: [2,2,2,2,2,2,2,2,3,3,3,2], state: 'silhouette', ix: [] },
  { sci: 'Sambucus nigra', group: 'plant', months: [1,1,1,2,3,3,2,3,3,2,1,1], state: 'silhouette',
    ix: [['pollinatedBy','Apis mellifera']] },
  { sci: 'Taraxacum officinale', group: 'plant', months: [0,1,2,3,3,2,2,2,1,2,1,0], state: 'silhouette', ix: [] },
  { sci: 'Crataegus monogyna', group: 'plant', months: [1,1,1,2,3,2,2,2,3,3,2,1], state: 'silhouette', ix: [] },
  { sci: 'Corylus avellana', group: 'plant', months: [3,3,2,2,2,2,2,3,3,2,1,2], state: 'silhouette',
    ix: [['hostOf','Polygonia c-album']] },
  { sci: 'Centaurea jacea', group: 'plant', months: [0,0,0,0,1,3,3,3,2,2,0,0], state: 'silhouette', ix: [] },
  // 🍄 fungi
  { sci: 'Amanita muscaria', group: 'fungus', months: [0,0,0,0,0,0,1,2,3,3,1,0], state: 'seen', ix: [] },
  { sci: 'Boletus edulis', group: 'fungus', months: [0,0,0,0,0,1,2,3,3,3,1,0], state: 'silhouette', ix: [] },
  { sci: 'Fomes fomentarius', group: 'fungus', months: [3,3,3,3,3,3,3,3,3,3,3,3], state: 'silhouette',
    ix: [['parasiteOf','Fagus sylvatica']] },
  // 🐸 amphibians
  { sci: 'Bufo bufo', group: 'amphibian', months: [0,1,3,3,2,2,2,2,2,2,0,0], state: 'studied',
    ix: [['eatenBy','Natrix natrix']] },
  { sci: 'Rana temporaria', group: 'amphibian', months: [0,2,3,3,2,2,2,2,2,2,1,0], state: 'silhouette',
    ix: [['eatenBy','Natrix natrix']] },
  { sci: 'Salamandra salamandra', group: 'amphibian', months: [0,0,1,2,2,2,2,2,3,3,1,0], state: 'silhouette', ix: [] }, // deliberately empty → honest empty state
  // 🦎 reptiles
  { sci: 'Lacerta agilis', group: 'reptile', months: [0,0,1,2,3,3,3,3,3,1,0,0], state: 'studied', ix: [] },
  { sci: 'Natrix natrix', group: 'reptile', months: [0,0,1,2,3,3,3,3,2,1,0,0], state: 'silhouette', ix: [] },
]

const INVERSE = { eats: 'eatenBy', eatenBy: 'eats', pollinates: 'pollinatedBy', pollinatedBy: 'pollinates',
  hostOf: 'hasHost', hasHost: 'hostOf', parasiteOf: 'hasParasite', hasParasite: 'parasiteOf',
  visitsFlowersOf: 'flowersVisitedBy', flowersVisitedBy: 'visitsFlowersOf' }

const get = async (url) => {
  const r = await fetch(url, { headers: H })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const twoSentences = (t = '') => {
  const parts = t.replace(/\s*\([^)]*\)/g, '').split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„])/)
  return parts.slice(0, 2).join(' ').trim()
}

// 1 · Wikidata
const values = S.map((s) => `"${s.sci}"`).join(' ')
const sparql = `SELECT ?sci ?item (SAMPLE(?gbif) AS ?gbif) (SAMPLE(?image) AS ?image) (SAMPLE(?de) AS ?de) (SAMPLE(?en) AS ?en) (SAMPLE(?iucnLabel) AS ?iucn) (SAMPLE(?dewiki) AS ?dewiki) (SAMPLE(?enwiki) AS ?enwiki) WHERE {
  VALUES ?sci { ${values} }
  ?item wdt:P225 ?sci .
  OPTIONAL { ?item wdt:P846 ?gbif }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item rdfs:label ?de FILTER(LANG(?de)="de") }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en)="en") }
  OPTIONAL { ?item wdt:P141 ?iucnItem . ?iucnItem rdfs:label ?iucnLabel FILTER(LANG(?iucnLabel)="en") }
  OPTIONAL { ?dewiki schema:about ?item ; schema:isPartOf <https://de.wikipedia.org/> }
  OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
} GROUP BY ?sci ?item`
const wd = await get(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`)
const bySci = {}
for (const b of wd.results.bindings) {
  const sci = b.sci.value
  const cur = bySci[sci]
  if (!cur || (!cur.gbif && b.gbif)) bySci[sci] = { qid: b.item.value.split('/').pop(), gbif: b.gbif?.value, image: b.image?.value, de: b.de?.value, en: b.en?.value, iucn: b.iucn?.value, dewiki: b.dewiki?.value, enwiki: b.enwiki?.value }
}

// 2 · Commons attribution for lead images + candidate user photos
const fileOf = (url) => 'File:' + decodeURIComponent(url.split('/').pop()).replace(/_/g, ' ')
const imageInfo = async (titles) => {
  const out = {}
  for (let i = 0; i < titles.length; i += 40) {
    const q = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=480&iiextmetadatafilter=Artist%7CLicenseShortName%7CLicenseUrl&titles=${encodeURIComponent(titles.slice(i, i + 40).join('|'))}`)
    for (const p of Object.values(q.query.pages)) {
      const ii = p.imageinfo?.[0]; if (!ii) continue
      const m = ii.extmetadata ?? {}
      out[p.title] = { url: ii.thumburl.split('?')[0], author: strip(m.Artist?.value) || 'unknown', license: m.LicenseShortName?.value ?? '?', licenseUrl: m.LicenseUrl?.value, page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}` }
    }
  }
  return out
}
const lead = await imageInfo(S.map((s) => bySci[s.sci]?.image).filter(Boolean).map(fileOf))

const userPhoto = async (sci, avoid) => {
  const q = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(sci + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=480&iiextmetadatafilter=Artist%7CLicenseShortName%7CLicenseUrl`)
  for (const p of Object.values(q.query.pages ?? {})) {
    if (p.title === avoid || !/\.jpe?g$/i.test(p.title)) continue
    const ii = p.imageinfo?.[0]; const m = ii?.extmetadata ?? {}
    if (!ii || !m.LicenseShortName) continue
    return { url: ii.thumburl.split('?')[0], author: strip(m.Artist?.value) || 'unknown', license: m.LicenseShortName.value, licenseUrl: m.LicenseUrl?.value, page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}` }
  }
}

// 3 · de.wikipedia intro
const intro = async (title) => {
  if (!title) return null
  try { const j = await get(`https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(decodeURIComponent(title.split('/').pop()))}`); return { text: twoSentences(j.extract), source: j.content_urls?.desktop?.page, license: 'CC BY-SA 4.0' } } catch { return null }
}

const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s
const titleOf = (url) => url ? decodeURIComponent(url.split('/').pop()).replace(/_/g, ' ').replace(/ \(.*\)$/, '') : undefined
// grid-friendly German names where the Wikipedia title is a mouthful
const DE = { 'Rubus fruticosus': 'Brombeere', 'Sciurus vulgaris': 'Eichhörnchen', 'Erinaceus europaeus': 'Igel', 'Corvus corone': 'Rabenkrähe', 'Apis mellifera': 'Honigbiene',
  'Corylus avellana': 'Hasel', 'Crataegus monogyna': 'Weißdorn', 'Hedera helix': 'Efeu', 'Boletus edulis': 'Steinpilz', 'Taraxacum officinale': 'Löwenzahn',
  'Coccinella septempunctata': 'Marienkäfer', 'Bombus terrestris': 'Erdhummel', 'Vespula vulgaris': 'Wespe', 'Tettigonia viridissima': 'Heupferd' }
const species = []
for (const s of S) {
  const w = bySci[s.sci] ?? {}
  const img = w.image ? lead[fileOf(w.image)] : undefined
  const up = s.userPhoto ? await userPhoto(s.sci, w.image && fileOf(w.image)) : undefined
  const it = await intro(w.dewiki)
  const seen = s.state === 'seen' || s.state === 'both'
  species.push({
    id: s.sci.toLowerCase().replace(/[^a-z]+/g, '-'),
    gbifKey: w.gbif ? Number(w.gbif) : null, wikidata: w.qid ?? null,
    names: { sci: s.sci, de: DE[s.sci] ?? titleOf(w.dewiki) ?? cap(w.de) ?? s.sci, en: (w.en && w.en !== s.sci ? cap(w.en) : titleOf(w.enwiki)) ?? s.sci },
    group: s.group, iucn: w.iucn ? cap(w.iucn.toLowerCase()) : null,
    tags: ['einheimisch'],
    image: img ?? null, intro: it,
    months: s.months,
    interactions: s.ix.map(([kind, target]) => ({ kind, target: target.toLowerCase().replace(/[^a-z]+/g, '-'), source: 'GloBI' })),
    state: { studied: s.state === 'studied' || s.state === 'both', seen,
      seenFirst: seen ? '2026-09-0' + (1 + species.length % 4) : null,
      userPhoto: up ?? null },
  })
}
// mirror interactions so every edge is visible from both ends
const ids = new Set(species.map((s) => s.id))
for (const sp of species) for (const ix of [...sp.interactions]) {
  if (!ids.has(ix.target)) throw new Error(`dangling ${sp.id} → ${ix.target}`)
  const t = species.find((x) => x.id === ix.target)
  const inv = INVERSE[ix.kind]
  if (!t.interactions.some((y) => y.target === sp.id && y.kind === inv)) t.interactions.push({ kind: inv, target: sp.id, source: 'GloBI', mirrored: true })
}
writeFileSync(join(here, '../fixtures/species.json'), JSON.stringify(species, null, 1))
const c = { silhouette: 0, studied: 0, seen: 0, both: 0 }
for (const sp of species) c[sp.state.studied && sp.state.seen ? 'both' : sp.state.studied ? 'studied' : sp.state.seen ? 'seen' : 'silhouette']++
console.log(species.length, 'species', c)
for (const sp of species) if (!sp.image || !sp.gbifKey || !sp.intro) console.log('⚠️ incomplete', sp.names.sci, { image: !!sp.image, gbif: !!sp.gbifKey, intro: !!sp.intro })
