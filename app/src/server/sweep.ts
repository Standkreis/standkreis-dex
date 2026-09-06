import { db } from './db'
import { deleteAbandonedPhotos } from './photos'
import { startRegionJob } from './routers/dex'

// The restart sweep (handoff 0009 Track B; findings 0007 C2, 0008 A7 A11). The region job and the content kick run
// in-process and die with the server; `Region.status` and `Taxon.contentAt` say what was left. On start (instrumentation
// `register`) and by hand (`npm run etl sweep`) this heals: no job table, no worker, no migration.
// Two servers on one database (Track A's and this one in dev) would both sweep: a transaction-scoped advisory lock lets
// one in, the other logs and leaves.
// Handoff 0011 Track B: on Vercel the hourly cron route calls this with a deadline under the function's `maxDuration`;
// once it passes, no further region restart or content batch is started and the result says `cut: true`. Every step
// is idempotent (`Region.status`, `Taxon.contentAt`), so the next hour continues where this one stopped.

const LOCK = 0x0de55eec // "dex sweep", any constant does
const QUEUED_AGE = 5 * 60_000
const BATCH = 20
export type SweepResult = { regions: string[]; content: number; contentDone: number; contentFailed: number; photos: number; seconds: number; cut: boolean }

export async function sweep(log: (s: string) => void = (s) => console.log(`[sweep] ${s}`), opts: { deadlineMs?: number } = {}): Promise<SweepResult | null> {
  const t0 = Date.now()
  const over = () => opts.deadlineMs !== undefined && Date.now() - t0 > opts.deadlineMs
  let cut = false
  return db.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<[{ locked: boolean }]>`select pg_try_advisory_xact_lock(${LOCK}) as locked`
      if (!locked) { log('another process is sweeping; skipped'); return null }

      // 1. Regions left `queued` by a dead server: older than five minutes, so a job a live server started a moment ago is left alone.
      const stale = await db.region.findMany({ where: { status: 'queued', createdAt: { lt: new Date(Date.now() - QUEUED_AGE) } }, select: { gadmGid: true, name: true } })
      const regions = stale.map((r) => r.gadmGid)
      if (stale.length) log(`restarting ${stale.length} queued region(s): ${stale.map((r) => `${r.name} (${r.gadmGid})`).join(', ')}`)
      for (const r of stale) {
        if (over()) { cut = true; break }
        await startRegionJob(r.gadmGid) // in order; each runs facets, set and content
      }

      // 2. Taxa without content: in a ready region's set, or logged (E13's out-of-set finds, the kick that died). Batches of 20, like the log's kick.
      const { runContent } = await import('../../etl/content')
      const missing = await db.taxon.findMany({
        where: { contentAt: null, OR: [{ plausibility: { some: { region: { status: 'ready' } } } }, { sightings: { some: {} } }] },
        select: { gbifKey: true },
        orderBy: { gbifKey: 'asc' },
      })
      if (missing.length) log(`${missing.length} taxa without content`)
      let contentDone = 0, contentFailed = 0
      for (let i = 0; i < missing.length; i += BATCH) {
        if (over()) { cut = true; break }
        const keys = missing.slice(i, i + BATCH).map((t) => t.gbifKey)
        const r = await runContent({ keys, log: (s) => log(`content ${i / BATCH + 1}/${Math.ceil(missing.length / BATCH)}: ${s}`) })
        contentDone += r.done
        contentFailed += r.failed
      }

      // 3. Abandoned uploads: unattached user photos older than a day, rows and files.
      const photos = await deleteAbandonedPhotos()
      if (photos) log(`${photos} abandoned photo(s) removed`)

      const seconds = (Date.now() - t0) / 1000
      log(`done: regions ${regions.length} · content ${missing.length} (${contentDone} filled, ${contentFailed} failed) · photos ${photos} · ${seconds.toFixed(1)} s${cut ? ' · cut at the deadline, the rest waits for the next run' : ''}`)
      return { regions, content: missing.length, contentDone, contentFailed, photos, seconds, cut }
    },
    { maxWait: 5_000, timeout: 6 * 3_600_000 }, // the lock lives as long as the transaction; a region job can take an hour
  )
}
