// Step 2b of the Steckbrief grill: GIFT (Global Inventory of Floras and Traits, Göttingen) for the 643 plants. Open API,
// no key; one call per trait, one for the species list. Run from app/: node scripts/steckbrief-probe/gift.mjs
import { join } from 'node:path'
import { HERE, get, readJson, writeJson, norm, md, pct, requests } from './lib.mjs'

const API = 'https://gift.uni-goettingen.de/api/extended/index.php?query='
const { taxa } = readJson(join(HERE, 'taxa.json'))
const plants = taxa.filter((t) => t.tile === 'plant')
const binomial = (s) => norm(s).split(' ').slice(0, 2).join(' ')

const species = await get(API + 'species')
console.log(`GIFT species list: ${species.length} rows`)
const byName = new Map()
for (const s of species) { const k = binomial(s.work_species); if (!byName.has(k)) byName.set(k, s.work_ID) }
const matched = plants.map((p) => ({ p, id: byName.get(binomial(p.sciName)) ?? null }))
console.log(`matched ${matched.filter((m) => m.id).length} / ${plants.length} plants by name`)

const TRAITS = { '1.6.2': 'height max (m)', '1.2.1': 'growth form', '2.1.1': 'lifecycle', '2.3.1': 'life form', '3.7.1': 'flowering start', '3.7.2': 'flowering end', '3.21.1': 'flower colour', '3.6.2': 'pollination', '3.3.1': 'dispersal', '6.3.1': 'habitat', '1.7.1': 'aquatic' }
const values = {}
for (const [id, label] of Object.entries(TRAITS)) {
  const rows = await get(API + 'traits&traitid=' + id)
  const m = new Map(rows.map((r) => [String(r.work_ID), r.trait_value]))
  values[id] = m
  console.log(`  ${label}: ${rows.length} rows`)
}
const rows = Object.entries(TRAITS).map(([id, label]) => { const n = matched.filter((m) => m.id && values[id].has(String(m.id))).length; return [label, n, pct(n, plants.length)] })
const any = matched.filter((m) => m.id && Object.keys(TRAITS).some((id) => values[id].has(String(m.id)))).length
rows.push(['**any trait**', any, pct(any, plants.length)])
const out = md(['GIFT field', 'plants', 'of 643'], rows)
console.log(out)
const ex = (name) => { const m = matched.find((x) => x.p.sciName === name); if (!m?.id) return console.log(name, 'unmatched'); console.log(name, Object.entries(TRAITS).map(([id, l]) => `${l}=${values[id].get(String(m.id)) ?? '·'}`).join(' · ')) }
for (const n of ['Urtica dioica', 'Alnus glutinosa', 'Fagus sylvatica', 'Bellis perennis', 'Galanthus nivalis', 'Taraxacum officinale']) ex(n)
writeJson(join(HERE, 'gift.json'), { at: new Date().toISOString(), matched: matched.filter((m) => m.id).length, plants: plants.length, rows, examples: matched.filter((m) => m.id).slice(0, 5).map((m) => ({ name: m.p.sciName, traits: Object.fromEntries(Object.entries(TRAITS).map(([id, l]) => [l, values[id].get(String(m.id)) ?? null])) })), requests: requests() })
;(await import('node:fs')).writeFileSync(join(HERE, 'gift.md'), out + '\n')
