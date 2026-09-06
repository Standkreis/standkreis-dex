// C2 and C3 of handoff 0012 Track 0: a sighting logged through the app (outbox → flush → `journal.get` prefetched and
// persisted), its page never opened, then the worker offline and the page opened for the first time. Headless Chrome
// over CDP attached at the browser level as scripts/m8a/offline.mjs, so the offline switch reaches the worker.
// Run against the production build (`npm run build && NODE_ENV=production next start -p 3002`) on the dev DB.
// usage: node scripts/m12/sighting.mjs c2|c3 [outDir] [baseUrl]
//   c2: fresh identity in Mainz-Bingen → /log → "Xylaria" → photo → Wild → the store holds journal.get → offline → /sighting/<id>
//   c3: 31 sightings via the API for a fresh identity, each page opened once online (the persisted query per page),
//       then the store's size and how many journal.get entries it kept (the cap is 30).
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [mode = 'c2', outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const locale = 'de'
const jpegPath = process.env.JPEG ?? '/tmp/dex-0011a/test.jpg'
readFileSync(jpegPath) // fail early when the test JPEG is missing
const regionId = process.env.REGION ?? '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const taxonId = process.env.TAXON ?? 'b10cd329-72b5-46a7-a0a4-814857301335' // Xylaria hypoxylon, has an image asset
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { mode, base }
mkdirSync(outDir, { recursive: true })

// ── a fresh identity with the region set, as the onboarding leaves it ──────────────────────────────────────────────
let cookie = ''
const trpc = async (path, input, method = 'POST') => {
  const r = method === 'GET'
    ? await fetch(`${base}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input ?? null } }))}`, { headers: { cookie } })
    : await fetch(`${base}/api/trpc/${path}?batch=1`, { method, headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ 0: { json: input } }) })
  const set = r.headers.get('set-cookie'); if (set && !cookie) cookie = set.split(';')[0]
  const j = await r.json()
  return { status: r.status, ...(j[0].result?.data?.json !== undefined ? { data: j[0].result.data.json } : { error: j[0].error?.json?.message }) }
}
await trpc('identity.me', undefined, 'GET')
out.identity = cookie.split('=')[0] + '=' + cookie.split('=')[1]?.slice(0, 8) + '…'
out.setFilter = (await trpc('identity.setFilter', { regionId, tiles: ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish'], nowOnly: false })).status

// ── Chrome over CDP ────────────────────────────────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m12-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const workers = new Set()
let offline = false
const failed = []
const requests = new Map()
const calls = [] // every tRPC call the page made: path and the batch's procedures
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.requestWillBeSent') { requests.set(m.params.requestId, m.params.request.url); if (m.params.request.url.includes('/api/trpc/')) calls.push({ at: Date.now(), path: m.params.request.url.split('/api/trpc/')[1].split('?')[0], method: m.params.request.method }) }
  if (m.method === 'Network.loadingFailed') failed.push({ url: requests.get(m.params.requestId), error: m.params.errorText })
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); return }
  if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'service_worker') {
    workers.add(m.params.sessionId)
    raw('Network.enable', {}, m.params.sessionId).then(() => (offline ? setOffline(m.params.sessionId, true) : null))
  }
  if (m.method === 'Target.detachedFromTarget') workers.delete(m.params.sessionId)
}
const raw = (method, params = {}, sessionId) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })) })
const setOffline = (sessionId, on) => raw('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId)
const { targetInfos } = await raw('Target.getTargets')
const page = targetInfos.find((t) => t.type === 'page')
const { sessionId } = await raw('Target.attachToTarget', { targetId: page.targetId, flatten: true })
await raw('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable')
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => {
  const s = Date.now()
  while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return true; await sleep(150) }
  return false
}
const until = async (expression, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(expression)) return true; await sleep(250) }; return false }
const goOffline = async (on) => { offline = on; await setOffline(sessionId, on); for (const w of workers) await setOffline(w, on) }
const shot = async (name) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `t0-${name}-${locale}-light.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const nav = (path) => send('Page.navigate', { url: `${base}/${locale}${path}` })
const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`)
// The store is superjson in localStorage; the `json` half is enough here. Bytes: UTF-16 in Safari's quota, chars here.
const persisted = () => evaluate(`(() => { const raw = localStorage.getItem('dex.queries'); if (!raw) return null; const c = JSON.parse(raw).json; const q = c.clientState.queries.map((q) => q.queryKey[0].join('.') + ':' + q.state.status); return { chars: raw.length, bytes: new Blob([raw]).size, kb: +(new Blob([raw]).size / 1024).toFixed(1), queries: q.length, journalGet: q.filter((k) => k.startsWith('journal.get')).length, taxonPage: q.filter((k) => k.startsWith('taxon.page')).length, keys: [...new Set(q)], error: localStorage.getItem('dex.persist.error') } })()`)
const photoCached = () => evaluate(`(async () => { const c = await caches.open('dex-images'); const keys = await c.keys(); return { controller: !!navigator.serviceWorker.controller, photoEntries: keys.filter((k) => k.url.includes('/api/photo/')).length, entries: keys.length } })()`)
const swReady = async () => { const s = Date.now(); while (Date.now() - s < 60_000) { if (await evaluate('!!navigator.serviceWorker.controller') && (await persisted())?.keys.some((k) => k.startsWith('dex.set'))) return true; await sleep(500) } return false }
const sightingState = () => evaluate(`(() => { const img = document.querySelector('[data-testid=image]'); return { url: location.pathname, page: !!document.querySelector('[data-testid=sighting]'), title: document.querySelector('[data-testid=sighting] h1')?.textContent ?? null,
  image: img ? { src: new URL(img.src).pathname, decoded: img.complete && img.naturalWidth > 0, w: img.naturalWidth } : null, caption: document.querySelector('[data-testid=caption]')?.textContent ?? null,
  working: document.body.innerText.includes('Einen Moment') || document.body.innerText.includes('One moment'), banner: document.querySelector('[data-testid=offline-banner]')?.textContent ?? null, onLine: navigator.onLine } })()`)

await send('Network.setCookie', { name: 'dex_id', value: cookie.split('=')[1], url: base, httpOnly: true, sameSite: 'Lax' })
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await nav(''); await waitFor('[data-testid=grid] li'); out.swControls = await swReady()
await send('Page.reload'); await waitFor('[data-testid=grid] li'); await sleep(1000) // the second visit online, as on any phone

if (mode === 'c2') {
  // ── log through the app: search, the photo through the hidden input, Wild ──
  let t0 = Date.now()
  await nav('/log'); await waitFor('[data-testid=log-query]')
  await evaluate(`document.querySelector('[data-testid=log-query]').focus()`)
  await send('Input.insertText', { text: 'Xylaria' })
  await waitFor('[data-testid=log-row], [data-testid=log-backbone-row]')
  out.search = { ms: Date.now() - t0, row: await evaluate(`document.querySelector('[data-testid=log-row], [data-testid=log-backbone-row]')?.textContent ?? null`) }
  await evaluate(`document.querySelector('[data-testid=log-row], [data-testid=log-backbone-row]').click()`)
  await waitFor('[data-testid=log-save]')
  const { root } = await send('DOM.getDocument', { depth: 0 })
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-testid=photo-input]' })
  t0 = Date.now()
  await send('DOM.setFileInputFiles', { nodeId, files: [jpegPath] })
  out.photo = { attached: await waitFor('[data-testid=save-photo][data-photo]', 20_000), ms: Date.now() - t0, id: await evaluate(`document.querySelector('[data-testid=save-photo]')?.dataset.photo ?? null`) }
  t0 = Date.now()
  await evaluate(`document.querySelector('[data-testid=save-wild]').click()`)
  await until(`location.search.includes('fill=')`, 15_000)
  const sightingId = await evaluate(`new URLSearchParams(location.search).get('fill')`)
  await waitFor('[data-testid=fill-sheet]', 10_000)
  // The row lands, the flush prefetches journal.get, the persister writes it; the sheet's photo goes through the worker.
  out.landed = { ms: Date.now() - t0, id: sightingId, persistedGet: await until(`(() => { const raw = localStorage.getItem('dex.queries'); return !!raw && JSON.parse(raw).json.clientState.queries.some((q) => q.queryKey[0].join('.') === 'journal.get' && q.queryKey[1]?.input?.id === ${JSON.stringify(sightingId)} && q.state.status === 'success') })()`, 15_000),
    photoCached: await until(`caches.open('dex-images').then((c) => c.keys()).then((k) => k.some((r) => r.url.includes('/api/photo/')))`, 15_000), sheet: await text('[data-testid=fill-meta]'), pending: !!(await text('[data-testid=fill-pending]')) }
  await sleep(1000)
  out.callsAfterWild = calls.filter((c) => c.at >= t0).map((c) => `${c.method} ${c.path} +${c.at - t0}ms`)
  out.storeOnline = await persisted(); out.cacheOnline = await photoCached()
  if (!out.landed.persistedGet && process.env.PROBE) { await nav(`/sighting/${sightingId}`); await waitFor('[data-testid=sighting] h1'); await sleep(2000); out.probeOpenedOnline = { ...(await sightingState()), store: await persisted(), rawKeys: await evaluate(`JSON.parse(localStorage.getItem('dex.queries')).json.clientState.queries.map((q) => JSON.stringify(q.queryKey).slice(0, 80))`) } }
  await shot('c2-online-sheet')
  // ── offline: the page opens for the first time ──
  await goOffline(true); failed.length = 0
  t0 = Date.now()
  await nav(`/sighting/${sightingId}`)
  const opened = await waitFor('[data-testid=sighting]', 15_000)
  await until(`document.querySelector('[data-testid=image]')?.complete`, 5000)
  await sleep(1000)
  out.sightingOffline = { opened, ms: Date.now() - t0, ...(await sightingState()), body: opened ? undefined : await evaluate('document.body.innerText.slice(0, 200)') }
  out.failedOffline = failed.map((f) => `${f.error} ${(f.url ?? '').replace(base, '')}`).filter((f) => !f.includes('/api/trpc')).slice(0, 10)
  out.storeOffline = await persisted()
  await shot('c2-offline-sighting')
  await goOffline(false)
}

if (mode === 'c3') {
  // 31 sightings for this identity through the API (no photo: the reference image stands in), each page opened once online.
  const n = Number(process.env.N ?? 31)
  const ids = []
  for (let i = 0; i < n; i++) { const r = await trpc('sighting.create', { taxonId, at: new Date(Date.now() - i * 60_000).toISOString(), wildness: 'wild', note: `0012 T0 C3 #${i + 1}` }); if (r.data?.id) ids.push(r.data.id) }
  out.created = ids.length
  const t0 = Date.now()
  for (const sid of ids) { await nav(`/sighting/${sid}`); await waitFor('[data-testid=sighting] h1', 15_000); await sleep(400) }
  await nav('/journal'); await waitFor('[data-testid=day]'); await sleep(1500)
  out.opened = { pages: ids.length, ms: Date.now() - t0 }
  out.store = await persisted()
  out.perSightingBytes = await evaluate(`(() => { const c = JSON.parse(localStorage.getItem('dex.queries')).json; const g = c.clientState.queries.filter((q) => q.queryKey[0].join('.') === 'journal.get'); return g.length ? Math.round(g.reduce((s, q) => s + JSON.stringify(q).length, 0) / g.length) : 0 })()`)
}

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
