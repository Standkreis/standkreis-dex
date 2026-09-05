// E1 cell size · E2 threshold · E3 month · E4 sources. GBIF occurrence facets + iNaturalist species_counts.
// node cells.mjs --region Mainz-Bingen --month 9 --years 2016,2026 --thresholds 5,10,20 --basis observation
import { arg, gbifFacet, gbifSpecies, get, gridOver, areaKm2, pool, q, requests, resolveRegion, save, table, wikidataForGbif } from './lib.mjs'

const region = arg('region', 'Mainz-Bingen')
const month = Number(arg('month', new Date().getMonth() + 1))
const years = arg('years', '2016,2026')
const thresholds = arg('thresholds', '5,10,20').split(',').map(Number)
const basisArg = arg('basis', 'observation') // observation | all
const skip = new Set(arg('skip', '').split(',').filter(Boolean)) // e1,e4 once decided
const basis = basisArg === 'all' ? undefined : ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'OCCURRENCE']
const base = { month, year: years, hasCoordinate: true, occurrenceStatus: 'PRESENT', basisOfRecord: basis }
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const out = { region, month, years, basis: basisArg, thresholds }
const log = (...a) => console.log(...a, '\n')

const R = await resolveRegion(region)
out.resolved = { gadmGid: R.gadmGid, inatPlaceId: R.inatPlaceId, areaKm2: Math.round(areaKm2(R.geometry)) }
log(`# 🔬 cells.mjs · ${R.gadmName} (${R.higher}) · month ${month} · years ${years} · basis ${basisArg}`)
log(`GADM \`${R.gadmGid}\` · iNat place \`${R.inatPlaceId}\` · polygon ≈ ${out.resolved.areaKm2} km²`)

// ── E2 · Landkreis polygon, species counts ─────────────────────────────────
const lk = await gbifFacet('speciesKey', { ...base, gadmGid: R.gadmGid })
const lkCounts = Object.fromEntries(lk.counts.map((c) => [c.name, c.count]))
const allYears = await gbifFacet('speciesKey', { ...base, year: undefined, gadmGid: R.gadmGid })
log(`## E2 · Landkreis (GADM) in month ${month}\n`)
log(`Occurrences ${lk.total} · species ${lk.counts.length} (all years: ${allYears.total} occ · ${allYears.counts.length} species)`)
const dist = (counts) => [1, 2, 3, 5, 10, 15, 20, 30, 50, 100, 200].map((t) => [t, counts.filter((c) => c.count >= t).length])
log(table(['≥ obs', `species ${years}`, 'species all years'], dist(lk.counts).map(([t, n], i) => [t, n, dist(allYears.counts)[i][1]])))
out.distribution = { window: dist(lk.counts), allYears: dist(allYears.counts) }

// datasets behind the numbers
const ds = await gbifFacet('datasetKey', { ...base, gadmGid: R.gadmGid }, 8)
const dsRows = []
for (const c of ds.counts) { const d = await get(`https://api.gbif.org/v1/dataset/${c.name}`); dsRows.push([d?.title?.slice(0, 60) ?? c.name, c.count, `${((100 * c.count) / ds.total).toFixed(0)}%`, d?.license?.split('/').slice(-3, -1).join('-') ?? '']) }
log('Datasets:\n\n' + table(['dataset', 'occ', 'share', 'licence'], dsRows))
out.datasets = dsRows

// ── E1 · grids at 5, 10, 25 km ─────────────────────────────────────────────
log('## E1 · cells\n')
const e1 = []
out.cells = {}
for (const km of skip.has('e1') ? [] : [25, 10, 5]) {
  const cells = gridOver(R.geometry, km)
  const perCell = {}
  process.stderr.write(`  ${km} km: ${cells.length} cells …\n`)
  await pool(cells, 4, async (c) => {
    const f = await gbifFacet('speciesKey', { ...base, geometry: c.wkt })
    perCell[c.id] = { n: f.total, species: Object.fromEntries(f.counts.map((x) => [x.name, x.count])), centerInside: c.centerInside }
  })
  const union = {}
  const maxPerCell = {}
  for (const v of Object.values(perCell)) for (const [k, n] of Object.entries(v.species)) { union[k] = (union[k] ?? 0) + n; maxPerCell[k] = Math.max(maxPerCell[k] ?? 0, n) }
  const uniq = Object.keys(union)
  const notInLk = uniq.filter((k) => !lkCounts[k]).length
  const sizes = Object.values(perCell).map((v) => Object.keys(v.species).length).sort((a, b) => a - b)
  const median = sizes[Math.floor(sizes.length / 2)]
  const empty = sizes.filter((s) => s === 0).length
  e1.push([`${km} km`, cells.length, cells.filter((c) => c.centerInside).length, `${sizes[0]}–${sizes.at(-1)} (med ${median})`, empty, uniq.length, `${notInLk} (+${((100 * notInLk) / lk.counts.length).toFixed(0)}%)`,
    thresholds.map((t) => `≥${t}: any-cell ${uniq.filter((k) => maxPerCell[k] >= t).length} · sum ${uniq.filter((k) => union[k] >= t).length}`).join('<br>')])
  out.cells[km] = { cells: cells.map((c) => ({ id: c.id, n: perCell[c.id].n, species: Object.keys(perCell[c.id].species).length, centerInside: c.centerInside })), unionSpecies: uniq.length, spilloverSpecies: notInLk, union, maxPerCell }
}
log(table(['cell', 'cells', 'centre inside', 'species / cell', 'empty cells', 'union species', 'border spill vs GADM', 'thresholded (any cell · summed)'], e1))
log(`GADM polygon alone: ${lk.counts.length} species. "Border spill" = species that appear in the cell union but not inside the Landkreis polygon.`)

// ── names for the lists ────────────────────────────────────────────────────
const tMin = Math.min(...thresholds)
const listKeys = lk.counts.filter((c) => c.count >= tMin).map((c) => c.name)
const wd = await wikidataForGbif(listKeys)
const sp = {}
process.stderr.write(`  names for ${listKeys.length} species …\n`)
await pool(listKeys, 6, async (k) => { const s = await gbifSpecies(k); sp[k] = { sci: s?.canonicalName ?? s?.scientificName, kingdom: s?.kingdom, class: s?.class, order: s?.order, family: s?.family, rank: s?.rank } })
const GROUP = (s) => s.class === 'Aves' ? '🐦' : s.class === 'Mammalia' ? '🦌' : s.class === 'Insecta' ? '🦋' : s.kingdom === 'Plantae' ? '🌿' : s.kingdom === 'Fungi' ? '🍄' : s.class === 'Amphibia' ? '🐸' : s.class === 'Squamata' || s.class === 'Testudines' || s.class === 'Reptilia' ? '🦎' : '❔'
const row = (k) => ({ key: Number(k), n: lkCounts[k], nAll: allYears.counts.find((c) => c.name === k)?.count ?? 0, sci: sp[k].sci, de: wd[k]?.de ?? '', group: GROUP(sp[k]), class: sp[k].class, order: sp[k].order, qid: wd[k]?.qid })
const list = listKeys.map(row).sort((a, b) => b.n - a.n)
out.list = list

log(`## E2 · the list at three thresholds (month ${month}, ${years}, Landkreis polygon)\n`)
for (const t of skip.has('lists') ? [] : [...thresholds].sort((a, b) => b - a)) {
  const L = list.filter((r) => r.n >= t)
  const byGroup = {}
  for (const r of L) byGroup[r.group] = (byGroup[r.group] ?? 0) + 1
  log(`### ≥ ${t} observations → **${L.length} species** · ${Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(' · ')}\n`)
  log(table(['#', 'obs', '', 'Art', 'Deutsch', 'Ordnung'], L.map((r, i) => [i + 1, r.n, r.group, `*${r.sci}*`, r.de || '—', r.order ?? ''])))
}

// ── E3 · twelve months for ten known species ───────────────────────────────
log('## E3 · month profile, ten known species (Landkreis, ' + years + ')\n')
const known = ['Turdus merula', 'Garrulus glandarius', 'Polygonia c-album', 'Amanita muscaria', 'Vanessa atalanta', 'Apus apus', 'Grus grus', 'Galanthus nivalis', 'Lucanus cervus', 'Erinaceus europaeus']
const monthTotal = await gbifFacet('month', { ...base, month: undefined, gadmGid: R.gadmGid })
const tot = Object.fromEntries(monthTotal.counts.map((c) => [c.name, c.count]))
const e3 = []
out.months = { totals: tot, species: {} }
for (const name of known) {
  const m = await get(`https://api.gbif.org/v1/species/match?${q({ name, rank: 'SPECIES' })}`)
  const f = await gbifFacet('month', { ...base, month: undefined, gadmGid: R.gadmGid, speciesKey: m.usageKey })
  const by = Object.fromEntries(f.counts.map((c) => [c.name, c.count]))
  const arr = MONTHS.map((_, i) => by[i + 1] ?? 0)
  const total = arr.reduce((a, b) => a + b, 0)
  const share = arr.map((n, i) => (tot[i + 1] ? (1000 * n) / tot[i + 1] : 0)) // per mille of all observations that month
  const peak = Math.max(...share)
  const bar = share.map((s) => (peak ? '▁▂▃▄▅▆▇█'[Math.min(7, Math.round((7 * s) / peak))] : '·')).join('')
  e3.push([`*${name}*`, total, ...arr, bar])
  out.months.species[name] = { key: m.usageKey, total, byMonth: arr, sharePerMille: share.map((s) => +s.toFixed(1)) }
}
log(table(['Art', 'Σ', ...MONTHS, 'relative'], e3))
log('Bars = share of all observations in that month (observer effort normalised). Raw obs per month above them.\n' + table(['alle Arten', ...MONTHS], [['obs', ...MONTHS.map((_, i) => tot[i + 1] ?? 0)]]))

// ── E4 · iNaturalist vs GBIF ───────────────────────────────────────────────
log('## E4 · iNaturalist species_counts for the same place and month\n')
async function inatSpecies(params) {
  const acc = []
  for (let page = 1; page <= 10; page++) {
    const j = await get(`https://api.inaturalist.org/v1/observations/species_counts?${q({ place_id: R.inatPlaceId, month, per_page: 500, page, ...params })}`)
    acc.push(...j.results)
    if (acc.length >= j.total_results || j.results.length === 0) break
  }
  return acc.filter((r) => r.taxon.rank === 'species').map((r) => ({ name: r.taxon.name, n: r.count, id: r.taxon.id }))
}
const [inRG, inAll, inCasual] = skip.has('e4') ? [[], [], []] : await Promise.all([inatSpecies({ quality_grade: 'research' }), inatSpecies({ verifiable: true }), inatSpecies({ quality_grade: 'casual' })])
const gbifNames = new Set(list.map((r) => r.sci))
const gbifAllNames = new Set(); for (const k of lk.counts) { if (sp[k.name]) gbifAllNames.add(sp[k.name].sci) }
const e4 = []
for (const [label, L] of [['iNat research grade', inRG], ['iNat verifiable (RG + needs ID)', inAll], ['iNat casual', inCasual]]) {
  const cnt = (t) => L.filter((r) => r.n >= t).length
  const inGbifList = L.filter((r) => gbifNames.has(r.name)).length
  e4.push([label, L.length, ...thresholds.map(cnt), `${inGbifList} / ${L.length}`])
}
log(table(['source', `species (m${month}, all years)`, ...thresholds.map((t) => `≥${t}`), `also in GBIF list (≥${tMin})`], e4))
const rgNames = new Set(inRG.map((r) => r.name))
const gbifOnly = list.filter((r) => r.n >= thresholds[1] && !rgNames.has(r.sci))
const inatOnly = inRG.filter((r) => r.n >= thresholds[1] && !gbifAllNames.has(r.name))
log(`GBIF ≥${thresholds[1]} but absent from iNat research grade: **${gbifOnly.length}** — ${gbifOnly.slice(0, 12).map((r) => r.de || r.sci).join(', ')}${gbifOnly.length > 12 ? ' …' : ''}`)
log(`iNat RG ≥${thresholds[1]} but absent from GBIF (any count): **${inatOnly.length}** — ${inatOnly.slice(0, 12).map((r) => r.name).join(', ')}${inatOnly.length > 12 ? ' …' : ''}`)
out.inat = { research: inRG, verifiable: inAll, casual: inCasual, gbifOnly, inatOnly }

const f = save(`cells-${region.toLowerCase()}-m${month}.json`, out)
log(`\nrequests this run: ${JSON.stringify(requests())} · saved ${f}`)
