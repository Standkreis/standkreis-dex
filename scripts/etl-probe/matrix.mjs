// The ETL in miniature: species × month matrix for a region, E2 cut, E3 shares and words, names and image via Wikidata.
// Writes out/fixture-<region>.json = the first real fixture. node matrix.mjs --region Mainz-Bingen --month 9
import { arg, gbifFacet, gbifSpecies, pool, resolveRegion, save, table, wikidataForGbif } from './lib.mjs'
const region = arg('region', 'Mainz-Bingen'), month = Number(arg('month', 9)), years = arg('years', '2016,2026')
const R = await resolveRegion(region)
const base = { year: years, hasCoordinate: true, occurrenceStatus: 'PRESENT', basisOfRecord: ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'OCCURRENCE'], gadmGid: R.gadmGid }
const M = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
// 12 calls: the matrix
const months = await pool([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 4, (m) => gbifFacet('speciesKey', { ...base, month: m }, 10000))
const totals = months.map((f) => f.total)
const byKey = {}
months.forEach((f, i) => { for (const c of f.counts) { (byKey[c.name] ??= { n: 0, m: Array(12).fill(0) }); byKey[c.name].n += c.count; byKey[c.name].m[i] = c.count } })
// tiles (E5 + E12)
const REPT = ['Squamata', 'Testudines', 'Crocodylia']
const tile = (s) => s.class === 'Aves' ? 'bird' : s.class === 'Mammalia' ? 'mammal' : s.class === 'Amphibia' ? 'amphibian' : REPT.includes(s.class) ? 'reptile' : s.phylum === 'Chordata' ? 'fish' : s.kingdom === 'Animalia' ? 'insect' : s.kingdom === 'Plantae' ? 'plant' : s.kingdom === 'Fungi' ? 'fungus' : null
const keys = Object.keys(byKey).filter((k) => byKey[k].n >= 10)
const sp = {}
await pool(keys, 6, async (k) => { sp[k] = await gbifSpecies(k) })
const perTile = {}
for (const k of keys) { const t = sp[k] && tile(sp[k]); if (t) (perTile[t] ??= []).push(k) }
// E2 cut: 90 % of the tile's observations, floor 10
const set = []
for (const [t, ks] of Object.entries(perTile)) {
  ks.sort((a, b) => byKey[b].n - byKey[a].n); const eff = ks.reduce((a, k) => a + byKey[k].n, 0); let acc = 0
  for (const k of ks) { if (acc >= eff * 0.9) break; acc += byKey[k].n; set.push({ key: Number(k), tile: t }) }
}
// E3 shares and words
const words = (sh) => { const p = Math.max(...sh); if (Math.min(...sh) >= p * 0.1) return 'Ganzes Jahr'; const on = sh.map((x) => x >= p * 0.25); const out = []; for (let i = 0; i < 12; i++) { if (on[i] && !on[(i + 11) % 12]) { let e = i; while (on[(e + 1) % 12] && e < i + 11) e++; out.push(e === i ? M[i] : `${M[i]}–${M[e % 12]}`) } } return out.join(', ') }
const wd = await wikidataForGbif(set.map((r) => String(r.key)))
const fixture = set.map((r) => {
  const s = sp[r.key], b = byKey[r.key], w = wd[r.key] ?? {}
  const share = b.m.map((n, i) => (totals[i] ? n / totals[i] : 0)); const peak = Math.max(...share)
  return { gbifKey: r.key, sci: s.canonicalName, de: w.de ?? null, en: w.en ?? null, tile: r.tile, order: s.order ?? null, obs: b.n, byMonth: b.m, sharePerMille: share.map((x) => +(1000 * x).toFixed(2)), nowRatio: peak ? +(share[month - 1] / peak).toFixed(2) : 0, now: peak ? share[month - 1] >= peak * 0.25 : false, words: words(share), qid: w.qid ?? null, image: w.img ?? null, iucn: w.iucn ?? null, dewiki: w.dewiki ?? null, enwiki: w.enwiki ?? null }
}).sort((a, b) => b.nowRatio - a.nowRatio || b.obs - a.obs)
const f = save(`fixture-${region.toLowerCase()}.json`, { region: R.gadmName, gadmGid: R.gadmGid, years, generated: new Date().toISOString().slice(0, 10), monthTotals: totals, species: fixture })
const T = {}; for (const r of fixture) { (T[r.tile] ??= { set: 0, now: 0, year: 0 }); T[r.tile].set++; if (r.now) T[r.tile].now++; if (r.words === 'Ganzes Jahr') T[r.tile].year++ }
console.log(`# ${R.gadmName} · ${totals.reduce((a, b) => a + b, 0)} obs · set ${fixture.length} · "nur jetzt" (${M[month - 1]}) ${fixture.filter((r) => r.now).length} · "Ganzes Jahr" ${fixture.filter((r) => r.words === 'Ganzes Jahr').length}\n`)
console.log(table(['tile', 'set', `jetzt (${M[month - 1]})`, 'Ganzes Jahr'], Object.entries(T).sort((a, b) => b[1].set - a[1].set).map(([t, v]) => [t, v.set, v.now, v.year])))
console.log(`\nsaved ${f}`)
