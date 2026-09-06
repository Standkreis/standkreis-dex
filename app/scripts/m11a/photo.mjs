// C1 and C3 of handoff 0011 Track A: a photo through the Blob seam, then the worker offline. Run against the production
// build (`npm run build && next start -p 3002`) with the token loaded: `node --env-file=.env.local scripts/m11a/photo.mjs c1|c3 [outDir] [baseUrl]`.
//   c1: POST /api/photo (a fresh identity) → GET /api/photo/<id> (no redirect, streamed) → the object is in the store
//       (`list()`) → sighting.create with the photo → journal.remove → the object is gone, GET is 404.
//   c3: as c1 up to the sighting, then headless Chrome over CDP (attached at the browser level as scripts/m8a/offline.mjs,
//       so the offline switch reaches the worker) opens the diary and the sighting online, goes offline, opens both again:
//       the photo must decode from the worker's cache. Then the delete as in c1.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { list } from '@vercel/blob'

const [mode = 'c1', outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const locale = 'de'
const jpeg = readFileSync(process.env.JPEG ?? '/tmp/dex-0011a/test.jpg')
const taxonId = process.env.TAXON ?? 'b10cd329-72b5-46a7-a0a4-814857301335'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ms = (t0) => Date.now() - t0
const out = { mode, base }
mkdirSync(outDir, { recursive: true })

// ── the server side: upload, view, bind, delete ────────────────────────────────────────────────────────────────────
let cookie = ''
const trpc = async (path, input) => {
  const r = await fetch(`${base}/api/trpc/${path}?batch=1`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ 0: { json: input } }) })
  const j = await r.json()
  return { status: r.status, ...(j[0].result?.data?.json !== undefined ? { data: j[0].result.data.json } : { error: j[0].error?.json?.message }) }
}
// Where the object is: the Blob store (the driver's token lists it) and, for the disk control run (C2), PHOTO_DIR.
const inStore = async (id) => {
  const { blobs } = await list({ prefix: `photos/${id}` })
  const blob = blobs.map((b) => ({ pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt }))
  return process.env.PHOTO_DIR ? { blob, disk: existsSync(join(process.env.PHOTO_DIR, `${id}.jpg`)) } : blob
}
const view = async (id) => {
  const t0 = Date.now()
  const r = await fetch(`${base}/api/photo/${id}`, { redirect: 'manual', headers: { cookie } })
  const body = r.status === 200 ? new Uint8Array(await r.arrayBuffer()) : null
  return { status: r.status, ms: ms(t0), type: r.headers.get('content-type'), cache: r.headers.get('cache-control'), length: r.headers.get('content-length'), location: r.headers.get('location'), bytes: body?.length ?? 0, jpeg: !!body && body[0] === 0xff && body[1] === 0xd8, same: !!body && Buffer.compare(Buffer.from(body), jpeg) === 0 }
}

let t0 = Date.now()
const form = new FormData(); form.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'test.jpg')
const up = await fetch(`${base}/api/photo`, { method: 'POST', body: form })
cookie = (up.headers.get('set-cookie') ?? '').split(';')[0]
const photo = await up.json()
out.upload = { status: up.status, ms: ms(t0), id: photo.id, url: photo.url, identityCookie: cookie.split('=')[0], jpegBytes: jpeg.length }
out.storeAfterUpload = await inStore(photo.id)
out.view = await view(photo.id)
out.viewAgain = await view(photo.id) // the second read: the SDK's CDN cache, if any, shows in the time
const created = await trpc('sighting.create', { taxonId, at: new Date().toISOString(), wildness: 'wild', photoId: photo.id, note: '0011 A blob check' })
out.sighting = created
const sightingId = created.data?.id

// ── the browser side (c3): diary and sighting online, then offline ─────────────────────────────────────────────────
if (mode === 'c3' && sightingId) {
  const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const port = 9222 + Math.floor(Math.random() * 500)
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m11a-${port}`, 'about:blank'], { stdio: 'ignore' })
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
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.method === 'Network.requestWillBeSent') requests.set(m.params.requestId, m.params.request.url)
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
  await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable')
  const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
  const waitFor = async (selector, t = 30_000) => {
    const s = Date.now()
    while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return true; await sleep(150) }
    return false
  }
  const goOffline = async (on) => { offline = on; await setOffline(sessionId, on); for (const w of workers) await setOffline(w, on) }
  const shot = async (name) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `a-${name}-${locale}-light.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
  // What the page shows of the photo: every <img> whose src is the capability URL, and whether it decoded.
  const photoImgs = () => evaluate(`(() => [...document.querySelectorAll('img')].filter((i) => i.src.includes('/api/photo/')).map((i) => ({ src: new URL(i.src).pathname, decoded: i.complete && i.naturalWidth > 0, w: i.naturalWidth })))()`)
  const cached = () => evaluate(`(async () => { const c = await caches.open('dex-images'); const keys = await c.keys(); const mine = keys.filter((k) => k.url.includes('/api/photo/')); const r = mine[0] && await c.match(mine[0]); return { controller: !!navigator.serviceWorker.controller, photoEntries: mine.length, entries: keys.length, type: r?.headers.get('content-type'), bytes: r ? (await r.blob()).size : 0 } })()`)
  const swReady = async () => { const s = Date.now(); while (Date.now() - s < 60_000) { if (await evaluate('!!navigator.serviceWorker.controller')) return true; await sleep(500) } return false }

  await send('Network.setCookie', { name: 'dex_id', value: cookie.split('=')[1], url: base, httpOnly: true, sameSite: 'Lax' })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: `${base}/${locale}/journal` }); await waitFor('[data-testid=day]'); await sleep(1500)
  out.swControls = await swReady()
  await send('Page.navigate', { url: `${base}/${locale}/journal` }); await waitFor('[data-testid=day]'); await sleep(2500)
  out.journalOnline = { imgs: await photoImgs(), cache: await cached() }
  await shot('c3-online-journal')
  await send('Page.navigate', { url: `${base}/${locale}/sighting/${sightingId}` }); await waitFor('[data-testid=image]'); await sleep(2500)
  out.sightingOnline = { imgs: await photoImgs(), cache: await cached() }
  await shot('c3-online-sighting')
  await goOffline(true); failed.length = 0
  await send('Page.navigate', { url: `${base}/${locale}/journal` }); await waitFor('[data-testid=day]', 15_000); await sleep(3000)
  out.journalOffline = { url: await evaluate('location.pathname'), days: await evaluate(`document.querySelectorAll('[data-testid=day]').length`), imgs: await photoImgs(), banner: await evaluate(`document.querySelector('[data-testid=offline-banner]')?.textContent ?? null`) }
  await shot('c3-offline-journal')
  await send('Page.navigate', { url: `${base}/${locale}/sighting/${sightingId}` }); await waitFor('[data-testid=image]', 15_000); await sleep(3000)
  out.sightingOffline = { url: await evaluate('location.pathname'), imgs: await photoImgs(), caption: await evaluate(`document.querySelector('[data-testid=caption]')?.textContent ?? null`), banner: await evaluate(`document.querySelector('[data-testid=offline-banner]')?.textContent ?? null`) }
  await shot('c3-offline-sighting')
  out.failedOffline = failed.filter((f) => f.url?.includes('/api/photo/'))
  await goOffline(false)
  ws.close(); proc.kill()
}

// ── delete in the diary: journal.remove, files first ───────────────────────────────────────────────────────────────
if (sightingId) {
  t0 = Date.now()
  out.remove = { ...(await trpc('journal.remove', { id: sightingId })), ms: ms(t0) }
  out.storeAfterRemove = await inStore(photo.id)
  out.viewAfterRemove = await view(photo.id)
}
console.log(JSON.stringify(out, null, 2))
