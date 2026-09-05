import { db } from '@/server/db'

// GET /api/health (handoff 0010 Track B): one line for the Compose healthcheck and the uptime monitor. `SELECT 1` proves
// the database answers; `buildId` is the served build (same id as the worker URL); `sweepAt` is when the restart sweep
// last finished in this process (null until then, stamped by instrumentation.ts). Never cached.
export const dynamic = 'force-dynamic'

export async function GET() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? null
  const sweepAt = (globalThis as { dexSweepAt?: string }).dexSweepAt ?? null
  try {
    await db.$queryRaw`select 1`
    return Response.json({ ok: true, buildId, sweepAt }, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    return Response.json({ ok: false, buildId, sweepAt, error: e instanceof Error ? e.message : String(e) }, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}
