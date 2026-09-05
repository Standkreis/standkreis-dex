// Ad-hoc SQL against the dev database for the handoff 0009 Track B evidence. usage: node scripts/m8b/q.mjs '<sql>' ...
import pg from 'pg'
const c = new pg.Client(process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex')
await c.connect()
for (const q of process.argv.slice(2)) console.log(q.slice(0, 70), JSON.stringify((await c.query(q)).rows))
await c.end()
