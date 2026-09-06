// Handoff 0016 Track A checks, against the production build (`npm run build` + `next start -p 3006`, PHOTO_DIR on disk,
// the dev DB with Mainz-Bingen filled, ANTHROPIC_API_KEY in the server's shell). Run from app/:
//   node scripts/m12/identify.mjs run [baseUrl]      A-C1 + A-C2: the 18 prepped photos of docs/research/walks/01/prep through
//                                                    POST /api/photo and sighting.identify, graded like id-probe/score.mjs against
//                                                    labels.csv `guess`, next to the grill's "Claude set" column; cache tokens per call
//   node scripts/m12/identify.mjs errors [baseUrl] [stubBase]
//                                                    A-C3: bytes that are no image (the real API's 400), an unknown photo and region on
//                                                    baseUrl; then a 429 and a timeout from a stub the script runs on :3107, against a
//                                                    second server started with ANTHROPIC_BASE_URL=http://localhost:3107 on stubBase
//                                                    (default :3007). Every answer must be a typed tRPC error, never HTTP 500.
// Raw answers land in scripts/m12/.cache/ (git-ignored). Nothing here prints a key.
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cached as grillCached, labels, photo } from '../id-probe/lib.mjs'

let [mode = 'run', base = 'http://localhost:3006'] = process.argv.slice(2)
const stubBase = process.argv[4] ?? 'http://localhost:3007' // errors mode: the server started with ANTHROPIC_BASE_URL=http://localhost:3107
const CACHE = new URL('./.cache/', import.meta.url).pathname
mkdirSync(CACHE, { recursive: true })
const PRICE = { in: 2, cw: 2.5, cr: 0.2, out: 10 }
const cents = (c) => ((c.input * PRICE.in + c.cacheWrite * PRICE.cw + c.cached * PRICE.cr + c.output * PRICE.out) / 1e6) * 100

let cookie = ''
const trpc = async (path, input, method = 'POST') => {
  const url = method === 'POST' ? `${base}/api/trpc/${path}?batch=1` : `${base}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input } }))}`
  const t0 = performance.now()
  const r = await fetch(url, { method, headers: { 'content-type': 'application/json', cookie, 'x-dex-locale': 'de' }, body: method === 'POST' ? JSON.stringify({ 0: { json: input } }) : undefined })
  const ms = Math.round(performance.now() - t0)
  const text = await r.text()
  let j
  try { j = JSON.parse(text)[0] } catch { return { status: r.status, ms, raw: text.slice(0, 200) } }
  return j.result ? { status: r.status, ms, data: j.result.data.json } : { status: r.status, ms, error: { code: j.error?.json?.data?.code, message: j.error?.json?.message } }
}
const upload = async (bytes, name = 'photo.jpg') => {
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'image/jpeg' }), name)
  const r = await fetch(`${base}/api/photo`, { method: 'POST', body: form, headers: { cookie } })
  if (!cookie) cookie = (r.headers.get('set-cookie') ?? '').split(';')[0]
  const j = await r.json()
  if (r.status !== 201) throw new Error(`upload ${r.status} ${JSON.stringify(j)}`)
  return j.id
}
const region = async () => {
  const r = await trpc('dex.regions', undefined, 'GET')
  const mb = (r.data ?? []).find((x) => x.name === 'Mainz-Bingen')
  if (!mb) throw new Error(`no Mainz-Bingen in dex.regions: ${JSON.stringify(r).slice(0, 200)}`)
  return mb
}

// ── the grade, as score.mjs (findings 0015 §📊), copied because that file runs its table on import ────────────────
const HONEST = new Set(['several', 'cannot tell', 'outside the set'])
const binomials = (s) => [...s.matchAll(/\b([A-Z][a-z]+) ([a-z]+)\b/g)].map((m) => `${m[1]} ${m[2]}`)
const genera = (s) => [...new Set([...s.matchAll(/\b([A-Z][a-z]+)\b/g)].map((m) => m[1]).filter((g) => !['Bonsai', 'Fruit'].includes(g)))]
function grade(l, answer, conf) {
  if (!answer) return { g: '⬜', why: 'no answer' }
  const a = answer.replace(/\s+sp\.?$/, '').trim()
  const guessSpecies = binomials(l.guess), guessGenera = genera(l.guess)
  const expectSeveral = /^several/.test(l.guess) || l.inSet === 'several'
  if (HONEST.has(a)) {
    if (a === 'several' && expectSeveral) return { g: '✅', why: 'several, as expected' }
    if (a === 'outside the set' && l.inSet === 'no') return { g: '✅', why: 'outside the set, as expected' }
    return { g: '⬜', why: a }
  }
  const [ag, as] = a.split(' ')
  if (!as && /(aceae|idae)$/.test(ag)) return { g: '⬜', why: `family ${ag}` }
  if (as && guessSpecies.includes(a)) return { g: '✅', why: a }
  if (guessGenera.includes(ag)) return { g: '🟡', why: as ? `${a}, guess ${l.guess}` : `genus ${ag}` }
  if (!as && guessSpecies.some((s) => s.split(' ')[0] === ag)) return { g: '🟡', why: `genus ${ag}` }
  return conf >= 0.5 ? { g: '❌', why: `${a} @${conf}` } : { g: '🔸', why: `${a} @${conf}` }
}
/** What the screen would show, as one string the grader understands. */
const shown = (d) => {
  if (d.subject === 'several') return 'several'
  if (d.subject === 'none') return 'cannot tell'
  if (d.outside !== null) return 'outside the set'
  if (d.answer) return d.answer.sciName
  return d.ladder.genus ?? d.ladder.family ?? 'cannot tell'
}
const glyphs = (t) => ['✅', '🟡', '⬜', '🔸', '❌'].map((g) => `${g}${t[g] ?? 0}`).join(' ')

if (mode === 'run') {
  const mb = await region()
  console.error(`region ${mb.name} ${mb.id}, set ${mb.setSize}`)
  const rows = labels()
  const ids = {}
  for (const l of rows) ids[l.n] = await upload(photo(l.n), `${l.n}.jpg`)
  console.error(`uploaded ${Object.keys(ids).length} photos, identity cookie ${cookie.split('=')[0]}`)
  const results = {}
  const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null // ONLY=4,8: call these, the rest from .cache
  const one = async (l) => {
    if (only && !only.has(l.n)) { results[l.n] = JSON.parse(readFileSync(join(CACHE, `identify-${l.n}.json`), 'utf8')); return }
    const r = await trpc('sighting.identify', { photoId: ids[l.n], regionId: mb.id, locale: 'de' })
    results[l.n] = r
    writeFileSync(join(CACHE, `identify-${l.n}.json`), JSON.stringify(r, null, 1))
    const d = r.data
    console.error(`${String(l.n).padStart(2)} ${r.status} ${String(r.ms).padStart(6)} ms  ${d ? `${d.subject.padEnd(7)} ${shown(d).padEnd(20)} conf=${d.confidence} in=${d.cost.input} cw=${d.cost.cacheWrite} cr=${d.cost.cached} out=${d.cost.output} ${d.cost.cents.toFixed(2)} ¢` : JSON.stringify(r.error ?? r.raw)}`)
  }
  await one(rows[0]) // the first call writes the region's cache; the rest read it, three at a time
  for (let i = 1; i < rows.length; i += 3) await Promise.all(rows.slice(i, i + 3).map(one))
  // A-C2: the second call for the region must read the cache
  const second = results[rows[1].n]?.data
  console.error(`\nA-C2 cache: first call cw=${results[rows[0].n]?.data?.cost.cacheWrite} cr=${results[rows[0].n]?.data?.cost.cached}; second call cw=${second?.cost.cacheWrite} cr=${second?.cost.cached} → ${second?.cost.cached > 0 ? '✅' : '❌'}`)

  const tally = { grill: {}, now: {} }
  const lines = ['| # | Photo · agent\'s guess | Claude set (grill 0015) | `sighting.identify` de (0016) | Ladder · outside | Cost |', '| --- | --- | --- | --- | --- | --- |']
  const sum = { input: 0, cacheWrite: 0, cached: 0, output: 0, cents: 0 }, times = []
  for (const l of rows) {
    const g = grillCached(`claude-claude-sonnet-5-set-${l.n}`)?.json
    const gc = g ? grade(l, g.answer, g.confidence) : null
    if (gc) tally.grill[gc.g] = (tally.grill[gc.g] ?? 0) + 1
    const r = results[l.n], d = r?.data
    let cell = `⚠️ ${r?.error?.code ?? r?.status}`
    let ladder = '—', costCell = '—'
    if (d) {
      const s = shown(d)
      const nc = grade(l, s, d.confidence)
      tally.now[nc.g] = (tally.now[nc.g] ?? 0) + 1
      cell = `${nc.g} ${s} ${d.confidence}`
      ladder = `${d.ladder.family ?? '·'} › ${d.ladder.genus ?? '·'} › ${d.ladder.species ?? '·'}${d.outside ? ` · outside: ${d.outside}` : ''}${d.answer ? ` · key ${d.answer.gbifKey}` : ''}`
      costCell = `${d.cost.cents.toFixed(2)} ¢ (${d.cost.input}/${d.cost.cacheWrite}/${d.cost.cached}/${d.cost.output})`
      for (const k of ['input', 'cacheWrite', 'cached', 'output', 'cents']) sum[k] += d.cost[k]
      times.push(r.ms)
    }
    lines.push(`| ${l.n} | ${l.file.replace(/\.(PNG|jpg)$/, '').replace('PHOTO-2026-09-06-19-29-', 'PHOTO …-')} · ${l.guess} | ${gc ? `${gc.g} ${g.answer} ${g.confidence}` : '—'} | ${cell} | ${ladder} | ${costCell} |`)
  }
  lines.push(`| | **Tally** | ${glyphs(tally.grill)} | ${glyphs(tally.now)} | | |`)
  times.sort((a, b) => a - b)
  console.log(lines.join('\n'))
  console.log(`\n| Calls | Median s | Max s | Tokens in / cache write / cache read / out | Cost | Per photo |\n| --- | --- | --- | --- | --- | --- |`)
  console.log(`| ${times.length} | ${(times[Math.floor(times.length / 2)] / 1000).toFixed(1)} | ${(times.at(-1) / 1000).toFixed(1)} | ${sum.input} / ${sum.cacheWrite} / ${sum.cached} / ${sum.output} | ${sum.cents.toFixed(1)} ¢ (recomputed ${cents(sum).toFixed(1)} ¢) | ${(sum.cents / times.length).toFixed(2)} ¢ |`)
  // the evidence language: how many evidence lines look German (umlauts, common German words)
  const de = Object.values(results).filter((r) => r.data).map((r) => r.data.evidence.join(' ')).filter((e) => /[äöüß]|\b(mit|und|der|die|das|typisch|Blätter|Früchte)\b/.test(e)).length
  console.log(`\nEvidence in German: ${de} of ${times.length} answers (locale de)`)
  process.exit(0)
}

if (mode === 'errors') {
  const out = {}
  const mb = await region()
  // (a) bytes that pass the upload's JPEG magic but are no image: the engine's 400 → 415
  const junk = new Uint8Array(4096); junk[0] = 0xff; junk[1] = 0xd8; for (let i = 2; i < junk.length; i++) junk[i] = (i * 7919) & 0xff
  const junkId = await upload(junk, 'junk.jpg')
  out.notImage = await trpc('sighting.identify', { photoId: junkId, regionId: mb.id })
  // (b) a photo that is not the identity's
  out.unknownPhoto = await trpc('sighting.identify', { photoId: '00000000-0000-4000-8000-000000000000', regionId: mb.id })
  // (c) unknown region
  out.unknownRegion = await trpc('sighting.identify', { photoId: junkId, regionId: '00000000-0000-4000-8000-000000000001' })
  // (d) 429 and (e) timeout, from the stub: this server must have ANTHROPIC_BASE_URL=http://localhost:3107
  let calls = 0
  const stub = createServer((req, res) => {
    calls++
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      const hasKey = !!req.headers['x-api-key']
      if (calls === 1) { res.writeHead(429, { 'content-type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'stub' } })); out.stub429 = { hasKey, bodyBytes: body.length }; return }
      out.stubHang = { hasKey, bodyBytes: body.length, at: Date.now() }
      setTimeout(() => { try { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{}') } catch {} }, 40_000).unref() // hang past the server's 25 s
    })
  })
  await new Promise((r) => stub.listen(3107, r))
  base = stubBase; cookie = '' // a fresh identity on the stub-backed server
  const realId = await upload(photo(15), '15.jpg')
  out.rateLimited = await trpc('sighting.identify', { photoId: realId, regionId: mb.id })
  out.timeout = await trpc('sighting.identify', { photoId: realId, regionId: mb.id })
  stub.close()
  console.log(JSON.stringify(out, null, 2))
  const all = [out.notImage, out.unknownPhoto, out.unknownRegion, out.rateLimited, out.timeout]
  console.log(`\n| Case | HTTP | tRPC code | Message |\n| --- | --- | --- | --- |`)
  for (const [name, r] of Object.entries({ 'bytes that are no image': out.notImage, 'unknown photo': out.unknownPhoto, 'unknown region': out.unknownRegion, '429 from the engine (stub)': out.rateLimited, 'engine hangs (stub, 40 s)': out.timeout }))
    console.log(`| ${name} | ${r.status} | ${r.error?.code ?? '—'} | ${r.error?.message ?? JSON.stringify(r.data ?? r.raw)} (${(r.ms / 1000).toFixed(1)} s) |`)
  console.log(`\nno 500: ${all.every((r) => r.status !== 500 && r.error?.code) ? '✅' : '❌'}`)
  process.exit(0)
}
