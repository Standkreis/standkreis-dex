import { env } from '@/server/env'
import { sweep } from '@/server/sweep'

// GET /api/cron/sweep (handoff 0011 Track B): the restart sweep, run by Vercel's cron (vercel.json, hourly) instead of
// per cold start. Vercel sends `Authorization: Bearer <CRON_SECRET>`; anything else is 401, and a server without the
// secret refuses every call (the sweep is `npm run etl -- sweep` on a laptop). Returns the `SweepResult`, or `null` when
// another process holds the advisory lock. The finish is stamped on globalThis for /api/health, as `register()` did:
// on Vercel that is "since this instance woke", the honest reading of a stamp without a table.
// `maxDuration` is the fluid-compute ceiling; the sweep gets a deadline under it so a long content backlog stops
// cleanly (the next hour continues, `contentAt` is per taxon) instead of the function being killed mid-batch.
export const dynamic = 'force-dynamic'
export const maxDuration = 300
const DEADLINE_MS = 240_000

export async function GET(req: Request) {
  const secret = env.CRON_SECRET
  const header = req.headers.get('authorization') ?? ''
  if (!secret || header !== `Bearer ${secret}`) return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } })
  try {
    const result = await sweep(undefined, { deadlineMs: DEADLINE_MS })
    ;(globalThis as { dexSweepAt?: string }).dexSweepAt = new Date().toISOString()
    return Response.json(result, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error('[sweep] failed:', error)
    return Response.json({ error }, { status: 500, headers: { 'cache-control': 'no-store' } })
  }
}
