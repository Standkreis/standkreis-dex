// The search cap on `taxon.search` (handoff 0009 Track B, findings 0008 A3): a token bucket per identity, 30 calls a minute, refilled
// continuously. In memory on globalThis like the kicks: one walker never empties it, a scraper does; a restart forgives.
const SEARCH_PER_MINUTE = 30
type Bucket = { tokens: number; at: number }
const buckets: Map<string, Bucket> = ((globalThis as unknown as { __dexSearchBuckets?: Map<string, Bucket> }).__dexSearchBuckets ??= new Map())
export function takeSearchToken(identityId: string, now = Date.now(), perMinute = SEARCH_PER_MINUTE): boolean {
  const b = buckets.get(identityId) ?? { tokens: perMinute, at: now }
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.at) / 60_000) * perMinute)
  b.at = now
  if (b.tokens < 1) { buckets.set(identityId, b); return false }
  b.tokens -= 1
  buckets.set(identityId, b)
  if (buckets.size > 10_000) buckets.clear() // a scraper with fresh cookies must not grow the map without bound
  return true
}
