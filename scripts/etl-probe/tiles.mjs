// Ranked-per-tile view of the September list (E2 per group). Reads out/cells-<region>-m<month>.json.
// node tiles.mjs --region Mainz-Bingen --month 9 --top 40
import { arg, load, table } from './lib.mjs'
const region = arg('region', 'Mainz-Bingen'), month = Number(arg('month', 9)), top = Number(arg('top', 40))
const j = load(`cells-${region.toLowerCase()}-m${month}.json`)
const TILES = { '🐦': 'Vögel', '🦋': 'Insekten', '🌿': 'Pflanzen', '🦌': 'Säugetiere', '🍄': 'Pilze', '🐸': 'Amphibien', '🦎': 'Reptilien', '❔': 'Rest' }
for (const [g, name] of Object.entries(TILES)) {
  const L = j.list.filter((r) => r.group === g)
  const tot = L.reduce((a, r) => a + r.n, 0)
  console.log(`\n### ${g} ${name} — ${L.length} Arten ≥${j.thresholds[0]} · ${tot} obs\n`)
  console.log(table(['#', 'obs', 'Art', 'Ordnung'], L.slice(0, top).map((r, i) => [i + 1, r.n, r.de || `*${r.sci}*`, r.order ?? ''])))
  if (L.length > top) console.log(`\n… ${L.length - top} weitere (obs ${L[top].n} → ${L.at(-1).n})`)
}
