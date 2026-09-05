// E11 refresh and rate limits, under decisions E1–E10. No network.
// node budget.mjs --region Mainz-Bingen
import { arg, load, table } from './lib.mjs'
const region = arg('region', 'Mainz-Bingen')
const y = load(`year-${region.toLowerCase()}.json`)
const N = y.list.length
console.log(`# 🔬 budget.mjs · ${region} · ${N} species in the set\n`)
console.log('## Per region, plausibility (E1 no grid · E3 12 months · E4 GBIF alone)\n')
console.log(table(['job', 'calls', 'to', 'wall time'], [
  ['species × month matrix', 12, 'GBIF occurrence facets, gadmGid + month', '12 × ~7 s ≈ 1.5 min'],
  ['whole-year species facet (for the cut)', 1, 'GBIF', '~8 s'],
  ['resolve region name → GADM gid', 1, 'GBIF geocode', '<1 s'],
]))
console.log('\n## Per species, content (once, re-run on demand)\n')
const per = [
  ['GBIF species record (ranks, tiles)', 1, 'GBIF'],
  ['Wikidata QID, names, P18, IUCN, AnAge id', 1 / 120, 'Wikidata SPARQL, batched 120'],
  ['Wikidata name-search fallback', 0.06, 'Wikidata API (6 % of species)'],
  ['iNat taxon + default photo (image ladder 1)', 1, 'iNat, ≤ 60/min'],
  ['Commons imageinfo (ladder 2, 92 %)', 1 / 40, 'Commons, batched 40'],
  ['Wikipedia summary de + en', 2, 'Wikipedia REST'],
  ['GloBI source + target', 2, 'GloBI'],
  ['look-alikes', 0, 'computed from the set'],
]
console.log(table(['job', 'calls / species', `calls for ${N}`, 'to'], per.map(([j, c, t]) => [j, c < 1 ? c.toFixed(3) : c, Math.ceil(c * N), t])))
const total = per.reduce((a, [, c]) => a + c * N, 0)
const inat = N
console.log(`\nTotal ≈ ${Math.ceil(total)} calls for one region's content; iNat alone ${inat} calls = ${(inat / 60).toFixed(0)} min at 60/min, ${(100 * inat / 10000).toFixed(0)} % of the 10k/day cap.`)
console.log('\n## Ten regions\n')
console.log(table(['', 'plausibility calls / month', 'content calls, first run', 'iNat share of 10k/day'], [
  ['1 region', 13, Math.ceil(total), `${(100 * inat / 10000).toFixed(0)} %`],
  ['10 regions, 50 % species overlap', 130, Math.ceil(total * 5.5), `${(100 * inat * 5.5 / 10000).toFixed(0)} %`],
]))
console.log('\nRefresh: plausibility monthly per active region (13 GBIF calls, cached 30 days); content never expires, re-fetched only when a species enters a set for the first time or on manual purge. Region added on demand by the first user who picks it; queue, not request-time.')
