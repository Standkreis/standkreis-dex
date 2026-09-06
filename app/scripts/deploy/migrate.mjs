// Vercel's build step: wake the database, then `prisma migrate deploy`.
// Neon (Free) suspends the compute after five idle minutes; the first connection wakes it, which can take longer than
// Prisma's 10 s advisory-lock timeout (P1002 on 2026-09-06, three builds in a row). So: poll `select 1` until it
// answers, with retries, then hand over to Prisma with a warm compute. Local: DATABASE_URL to Docker, wakes instantly.
import { spawnSync } from 'node:child_process'
import pg from 'pg'

// Direct (unpooled) connection, the same one prisma.config.ts hands to migrate: advisory locks and PgBouncer do not mix.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!url) { console.error('migrate: DATABASE_URL is not set'); process.exit(1) }

const deadline = Date.now() + 90_000
for (let attempt = 1; ; attempt++) {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20_000 })
  try {
    await client.connect()
    await client.query('select 1')
    console.log(`migrate: database awake after ${attempt} attempt${attempt === 1 ? '' : 's'}`)
    await clearStaleLock(client)
    await client.end()
    break
  } catch (e) {
    await client.end().catch(() => {})
    if (Date.now() > deadline) { console.error(`migrate: database did not wake in 90 s: ${e.message}`); process.exit(1) }
    console.log(`migrate: attempt ${attempt} failed (${e.code ?? e.message}), retrying`)
    await new Promise((r) => setTimeout(r, 3000))
  }
}

// Prisma's migrate lock (pg_advisory_lock(72707369)) is session-level. A build that took it over Neon's PgBouncer left it
// on a pooled server connection that nobody closes (2026-09-06: four builds in a row failed with the database awake).
// A holder that sits idle is such a leftover: end it. A holder that is active is a running migration: leave it and let
// Prisma wait. Production builds on Vercel do not overlap.
async function clearStaleLock(client) {
  const { rows } = await client.query(
    `select l.pid, a.state, a.application_name, (now() - a.state_change)::text as idle_for
       from pg_locks l join pg_stat_activity a on a.pid = l.pid
      where l.locktype = 'advisory' and l.objid = 72707369 and l.pid <> pg_backend_pid()`,
  )
  for (const r of rows) {
    if (r.state === 'active') { console.log(`migrate: lock held by an active session (pid ${r.pid}), waiting for it`); continue }
    const { rows: [k] } = await client.query('select pg_terminate_backend($1) as ok', [r.pid])
    console.log(`migrate: ended stale lock holder pid ${r.pid} (${r.state ?? 'unknown'}, ${r.application_name || 'no app name'}, idle ${r.idle_for}): ${k.ok}`)
  }
  if (!rows.length) console.log('migrate: lock is free')
}

for (let attempt = 1; attempt <= 3; attempt++) {
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' })
  if (r.status === 0) process.exit(0)
  console.log(`migrate: prisma migrate deploy failed (attempt ${attempt} of 3)`)
}
process.exit(1)
