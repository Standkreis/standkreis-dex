// Next runs `register` once when the server starts (nodejs and edge runtime alike). The restart sweep (handoff 0009
// Track B) heals what a dead process left behind: queued regions, taxa without content, abandoned photos. Not awaited,
// so the first request is not held up; the static export has no server and never calls this.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { sweep } = await import('./server/sweep')
  void sweep().catch((e) => console.error('[sweep] failed:', e instanceof Error ? e.message : e))
}
