// Next runs `register` once when the server starts (nodejs and edge runtime alike). The restart sweep (handoff 0009
// Track B) heals what a dead process left behind: queued regions, taxa without content, abandoned photos. Not awaited,
// so the first request is not held up; the static export has no server and never calls this.
// Handoff 0010 Track B: the environment is read first, so a production server missing a variable stops here, before
// it answers anything; the sweep's finish is stamped on globalThis for /api/health (the route handler is its own bundle).
// Handoff 0011 Track B: on Vercel `register` runs on every cold start, so the sweep would run "sometimes" and race
// itself across instances. There the hourly cron (`api/cron/sweep`) owns it; `register` only checks the environment.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  await import('./server/env')
  if (process.env.VERCEL === '1') {
    console.log('[sweep] on Vercel: skipped at start, the cron route /api/cron/sweep owns it')
    return
  }
  const { sweep } = await import('./server/sweep')
  void sweep()
    .then(() => { (globalThis as { dexSweepAt?: string }).dexSweepAt = new Date().toISOString() })
    .catch((e) => console.error('[sweep] failed:', e instanceof Error ? e.message : e))
}
