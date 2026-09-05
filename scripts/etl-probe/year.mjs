// Whole-year plausible set for a region, per tile. node year.mjs --region Mainz-Bingen --min 10
import { arg, gbifFacet, gbifSpecies, pool, resolveRegion, save, table } from './lib.mjs'
const region = arg('region', 'Mainz-Bingen'), min = Number(arg('min', 10)), years = arg('years', '2016,2026')
const R = await resolveRegion(region)
const base = { year: years, hasCoordinate: true, occurrenceStatus: 'PRESENT', basisOfRecord: ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'OCCURRENCE'], gadmGid: R.gadmGid }
const f = await gbifFacet('speciesKey', base, 10000)
console.log(`# ${region} · whole year ${years} · ${f.total} obs · ${f.counts.length} species\n`)
console.log(table(['≥ obs', 'species'], [1, 2, 3, 5, 10, 20, 50, 100].map((t) => [t, f.counts.filter((c) => c.count >= t).length])))
const keys = f.counts.filter((c) => c.count >= min)
const sp = {}
await pool(keys, 6, async (c) => { const s = await gbifSpecies(c.name); sp[c.name] = { sci: s?.canonicalName, kingdom: s?.kingdom, class: s?.class } })
const G = (s) => s.class === 'Aves' ? '🐦' : s.class === 'Mammalia' ? '🦌' : s.class === 'Insecta' ? '🦋' : s.kingdom === 'Plantae' ? '🌿' : s.kingdom === 'Fungi' ? '🍄' : s.class === 'Amphibia' ? '🐸' : ['Squamata', 'Testudines', 'Reptilia'].includes(s.class) ? '🦎' : '❔'
const tiles = {}
for (const c of keys) { const g = G(sp[c.name]); (tiles[g] ??= []).push({ ...c, sci: sp[c.name].sci }) }
console.log(`\n## per tile at ≥${min}, and with the 0.5 % / floor 3 rule on the tile's own effort\n`)
const rows = []
let tot = 0
for (const [g, L] of Object.entries(tiles).sort((a, b) => b[1].length - a[1].length)) {
  const eff = L.reduce((a, c) => a + c.count, 0); const cut = Math.max(3, Math.ceil(eff * 0.005)); const K = L.filter((c) => c.count >= cut); tot += K.length
  rows.push([g, L.length, eff, `≥${cut}`, K.length, K.slice(0, 5).map((c) => c.sci).join(', ')])
}
console.log(table(['tile', `species ≥${min}`, 'obs', 'cut', 'species', 'top 5'], rows), `\n\ntotal with rule: ${tot}`)
// the chosen set (E2): per tile, species covering 90 % of the tile's observations, floor 10
const list = []
for (const [g, L] of Object.entries(tiles)) {
  const S = [...L].sort((a, b) => b.count - a.count); const eff = S.reduce((a, c) => a + c.count, 0); let acc = 0
  for (const c of S) { if (acc >= eff * 0.9 || c.count < 10) break; acc += c.count; list.push({ key: Number(c.name), n: c.count, sci: c.sci, group: g, kingdom: sp[c.name].kingdom, class: sp[c.name].class }) }
}
console.log(`\nchosen set (90 % per tile, floor 10): ${list.length} species`)
save(`year-${region.toLowerCase()}.json`, { region, years, gadmGid: R.gadmGid, total: f.total, counts: f.counts, tiles, list })
