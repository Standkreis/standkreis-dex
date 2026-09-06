// Step 2 of the ID grill: Pl@ntNet identify/all on the 18, run "auto" (no organ) and run "organ" (habit / fruit / flower).
// Top-5 with scores, joined to set.json by sciName. Responses cached under .cache/plantnet-<run>-<n>.json.
// Run from app/: node scripts/id-probe/plantnet.mjs
import { requireKey, cached, store, labels, set, photo, ORGAN } from './lib.mjs'

const key = requireKey('PLANTNET_API_KEY')
const inSet = new Map(set().map((r) => [r.sciName, r]))
const MAX = 200
let calls = 0

async function identify(n, organ) {
  const id = `plantnet-${organ ?? 'auto'}-${n}`
  const hit = cached(id)
  if (hit) return hit
  if (++calls > MAX) throw new Error('request cap')
  const form = new FormData()
  form.append('images', new Blob([photo(n)], { type: 'image/jpeg' }), `${n}.jpg`)
  if (organ) form.append('organs', organ)
  const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(key)}&lang=de&include-related-images=false&nb-results=5`
  const t0 = performance.now()
  const r = await fetch(url, { method: 'POST', body: form })
  const ms = Math.round(performance.now() - t0)
  const text = await r.text()
  if (r.status === 401 || r.status === 403) { console.error(`PLANTNET_API_KEY rejected: HTTP ${r.status}`); process.exit(2) }
  let body; try { body = JSON.parse(text) } catch { body = { raw: text } }
  const out = { n, organ: organ ?? null, status: r.status, ms, at: new Date().toISOString(), body }
  store(id, out)
  return out
}

const rows = []
for (const l of labels()) {
  const n = Number(l.n)
  for (const organ of [null, ORGAN[n]]) {
    const res = await identify(n, organ)
    const top = (res.body.results ?? []).slice(0, 5).map((x) => ({ sci: x.species?.scientificNameWithoutAuthor, genus: x.species?.genus?.scientificNameWithoutAuthor, family: x.species?.family?.scientificNameWithoutAuthor, score: +x.score.toFixed(3), de: x.species?.commonNames?.[0] ?? null, inSet: inSet.has(x.species?.scientificNameWithoutAuthor) }))
    rows.push({ n, run: organ ?? 'auto', status: res.status, ms: res.ms, remaining: res.body.remainingIdentificationRequests ?? null, error: res.body.message ?? res.body.error ?? null, top })
    const t = top[0]
    console.log(`${String(n).padStart(2)} ${(organ ?? 'auto').padEnd(6)} ${res.status} ${String(res.ms).padStart(5)} ms  ${t ? `${t.sci} ${t.score}${t.inSet ? ' [set]' : ''}` : res.body.message ?? res.body.statusCode ?? '-'}`)
  }
}
store('plantnet-summary', rows)
console.log('calls this run:', calls)
