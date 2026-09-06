// Step 1 of the ID grill (handoff 0015 §🛠️): Mainz-Bingen's set from the DEV DB to set.json. Never Neon.
// Membership rule = dex.ts `set`: one Plausibility row per taxon in the region (record 0002). Run from app/: node scripts/id-probe/set.mjs
import pg from 'pg'
import { writeFileSync } from 'node:fs'

const url = process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex'
if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error('set.mjs runs against the dev DB only (DATABASE_URL must be localhost)')
const c = new pg.Client({ connectionString: url })
await c.connect()
const { rows } = await c.query(
  `select t."gbifKey", t."sciName", t."commonNames"->>'de' as de, t.tile
     from "Plausibility" p join "Taxon" t on t.id = p."taxonId" join "Region" r on r.id = p."regionId"
    where r."gadmGid" = 'DEU.11.19_1' order by t.tile, t."sciName"`,
)
await c.end()
const out = new URL('./set.json', import.meta.url).pathname
writeFileSync(out, JSON.stringify(rows, null, 1))
const byTile = {}
for (const r of rows) byTile[r.tile] = (byTile[r.tile] ?? 0) + 1
console.log(rows.length, 'rows →', out, byTile, 'without de name:', rows.filter((r) => !r.de).length)
