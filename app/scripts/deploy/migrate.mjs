// Vercel's build step: wake the database, then `prisma migrate deploy`.
// Neon (Free) suspends the compute after five idle minutes; the first connection wakes it, which can take longer than
// Prisma's 10 s advisory-lock timeout (P1002 on 2026-09-06, three builds in a row). So: poll `select 1` until it
// answers, with retries, then hand over to Prisma with a warm compute. Local: DATABASE_URL to Docker, wakes instantly.
import { spawnSync } from 'node:child_process'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) { console.error('migrate: DATABASE_URL is not set'); process.exit(1) }

const deadline = Date.now() + 90_000
for (let attempt = 1; ; attempt++) {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20_000 })
  try {
    await client.connect()
    await client.query('select 1')
    await client.end()
    console.log(`migrate: database awake after ${attempt} attempt${attempt === 1 ? '' : 's'}`)
    break
  } catch (e) {
    await client.end().catch(() => {})
    if (Date.now() > deadline) { console.error(`migrate: database did not wake in 90 s: ${e.message}`); process.exit(1) }
    console.log(`migrate: attempt ${attempt} failed (${e.code ?? e.message}), retrying`)
    await new Promise((r) => setTimeout(r, 3000))
  }
}

for (let attempt = 1; attempt <= 3; attempt++) {
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' })
  if (r.status === 0) process.exit(0)
  console.log(`migrate: prisma migrate deploy failed (attempt ${attempt} of 3)`)
}
process.exit(1)
