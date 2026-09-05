// The ETL CLI (handoff 0006 Track A). npm run etl -- <command> [args]
//   region <name | gadmGid>   GADM → 13 GBIF facets → cut per tile → Region, Taxon, Plausibility, Lookalike rows
//   refresh [--days 30]       re-run the region job for regions older than 30 days
//   content [--region <name>] [--purge <key>] [--limit n]
//                             fill Taxon content (names, intro, facts, assets, interactions) once per taxon
import { db } from './db'
import { requests } from './fetch'
import { TILES } from './rules'

const [cmd, ...rest] = process.argv.slice(2)
const flag = (name: string) => { const i = rest.indexOf(`--${name}`); return i > -1 ? rest[i + 1] : undefined }
const positional = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'))

const TILE_ICON: Record<string, string> = { bird: '🐦', mammal: '🦌', amphibian: '🐸', reptile: '🦎', fish: '🐟', insect: '🦋', plant: '🌿', fungus: '🍄' }

async function main() {
  switch (cmd) {
    case 'region': {
      const { runRegion } = await import('./region')
      const query = positional[0]
      if (!query) throw new Error('usage: etl region <name | gadmGid>')
      const r = await runRegion(query)
      const month = Number(flag('month') ?? new Date().getMonth() + 1)
      console.log(`\n${r.name} · ${r.total} obs · set ${r.set} · lookalike pairs ${r.lookalikes} · "nur jetzt" (month ${month}) ${r.nowInMonth(month)}`)
      console.log(TILES.map((t) => `${TILE_ICON[t]} ${r.perTile[t] ?? 0}`).join('  '))
      console.log(`${r.seconds.toFixed(1)} s · requests ${JSON.stringify(r.requests)}`)
      break
    }
    case 'refresh': {
      const { refresh } = await import('./region')
      const n = await refresh(Number(flag('days') ?? 30))
      console.log(`refreshed ${n} region(s) · requests ${JSON.stringify(requests())}`)
      break
    }
    case 'content': {
      const { runContent } = await import('./content')
      const r = await runContent({ region: flag('region'), purge: flag('purge') ? Number(flag('purge')) : undefined, limit: flag('limit') ? Number(flag('limit')) : undefined })
      console.log(`\ncontent: ${r.done} filled, ${r.failed} failed of ${r.taxa} · ${(r.seconds / 60).toFixed(1)} min`)
      console.log(`ladder ${JSON.stringify(r.ladder)} · intro ${JSON.stringify(r.intro)} · wikidata ${JSON.stringify(r.wikidata)} · edges ${r.edges} · new target rows ${r.targetsCreated}`)
      console.log(`requests ${JSON.stringify(r.requests)}`)
      break
    }
    default:
      console.log('usage: npm run etl -- region <name | gadmGid> [--month m] | refresh [--days 30] | content [--region <name>] [--purge <gbifKey>] [--limit n]')
      process.exitCode = 1
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => db.$disconnect())
