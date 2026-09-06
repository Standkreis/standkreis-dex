import { waitUntil } from '@vercel/functions'

// Work that outlives the response (handoff 0011 Track B). On Vercel a function is frozen once it has answered; the
// region job (`routers/dex.ts`) and the content kick (`routers/taxon.ts`) would die mid-flight. `waitUntil` keeps the
// invocation alive until the promise settles, up to the route's `maxDuration` (300 s on the tRPC handler). Elsewhere
// (`next start`, `next dev`, the ETL CLI) one process outlives every response and a detached promise is enough.
// The callers keep their `globalThis` maps, so a job is still started once per warm instance; the promise handed in
// must already catch its own errors (both callers do), `background` never awaits it.
export const onVercel = process.env.VERCEL === '1'

export function background(job: Promise<unknown>): void {
  if (onVercel) waitUntil(job)
  else void job
}
