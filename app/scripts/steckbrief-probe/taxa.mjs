// Step 1 of the Steckbrief grill (handoff 0019): every taxon in any region's set from the dev DB, read only, with the
// columns the joins need → taxa.json. Run from app/: node scripts/steckbrief-probe/taxa.mjs
import pg from 'pg'
import { join } from 'node:path'
import { HERE, DEV_DB, writeJson, md, pct } from './lib.mjs'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL_DEV ?? DEV_DB })
await client.connect()
const { rows: regions } = await client.query('select r.id, r.name, r."gadmGid", count(p.id)::int as n from "Region" r left join "Plausibility" p on p."regionId" = r.id group by r.id order by r.name')
const { rows } = await client.query(`
  select t.id, t."gbifKey", t."wikidataId", t."sciName", t."commonNames", t.rank, t.tile, t.class, t."order", t.genus, t.iucn,
         t.intro is not null as "hasIntro", t.intro->>'lang' as "introLang", t.facts,
         array_agg(r.name order by r.name) as regions,
         (select count(*) from "Interaction" i where i."sourceId" = t.id)::int as edges
  from "Taxon" t join "Plausibility" p on p."taxonId" = t.id join "Region" r on r.id = p."regionId"
  group by t.id order by t."gbifKey"`)
await client.end()

const out = rows.map((r) => ({ ...r, gbifKey: r.gbifKey, facts: r.facts ?? null }))
writeJson(join(HERE, 'taxa.json'), { at: new Date().toISOString(), regions, taxa: out })

const tiles = [...new Set(out.map((t) => t.tile))]
const by = (f) => tiles.map((tile) => out.filter((t) => t.tile === tile).filter(f).length)
const n = tiles.map((tile) => out.filter((t) => t.tile === tile).length)
console.log(md(['field', ...tiles, 'all'], [
  ['taxa', ...n, out.length],
  ['wikidataId', ...by((t) => t.wikidataId).map((x, i) => pct(x, n[i])), pct(out.filter((t) => t.wikidataId).length, out.length)],
  ['intro', ...by((t) => t.hasIntro).map((x, i) => pct(x, n[i])), pct(out.filter((t) => t.hasIntro).length, out.length)],
  ['iucn', ...by((t) => t.iucn).map((x, i) => pct(x, n[i])), pct(out.filter((t) => t.iucn).length, out.length)],
  ['any fact', ...by((t) => t.facts).map((x, i) => pct(x, n[i])), pct(out.filter((t) => t.facts).length, out.length)],
]))
console.log('regions', regions.map((r) => `${r.name} ${r.n}`).join(' · '))
const classes = {}
for (const t of out) classes[`${t.tile}/${t.class}`] = (classes[`${t.tile}/${t.class}`] ?? 0) + 1
console.log(Object.entries(classes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
