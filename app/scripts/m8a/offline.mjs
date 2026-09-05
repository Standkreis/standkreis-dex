// C1 and the offline shots (handoff 0009 Track A). Headless Chrome over CDP as scripts/m5a and m6a (no dependency), but
// attached at the browser level: `Network.emulateNetworkConditions` on the page alone leaves the service worker's own
// fetches online, so the offline switch is applied to the page session and to every service-worker session.
// usage: node scripts/m8a/offline.mjs c1 <dex_id> [de|en] [light|dark] [outDir] [baseUrl]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [mode = 'c1', dexId, locale = 'de', scheme = 'light', outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
if (!dexId) throw new Error('dex_id required')

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m8a-${port}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let version
for (let i = 0; i < 50 && !version; i++) {
  await sleep(200)
  version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined)
}
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const workers = new Set() // service-worker sessions
let offline = false
const consoleErrors = []
const requests = new Map() // requestId → url (page session), failed ones collected in `failed`
const failed = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.requestWillBeSent') requests.set(m.params.requestId, m.params.request.url)
  if (m.method === 'Network.loadingFailed') failed.push({ url: requests.get(m.params.requestId), error: m.params.errorText, fromSw: m.params.blockedReason })
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); return }
  if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'service_worker') {
    workers.add(m.params.sessionId)
    raw('Network.enable', {}, m.params.sessionId).then(() => (offline ? setOffline(m.params.sessionId, true) : null))
  }
  if (m.method === 'Target.detachedFromTarget') workers.delete(m.params.sessionId)
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text)
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push(m.params.entry.text)
}
const raw = (method, params = {}, sessionId) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })) })
const setOffline = (sessionId, on) => raw('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId)

// Attach the page; auto-attach every service worker that appears (a new worker after an update is a new target).
const { targetInfos } = await raw('Target.getTargets')
const page = targetInfos.find((t) => t.type === 'page')
const { sessionId } = await raw('Target.attachToTarget', { targetId: page.targetId, flatten: true })
await raw('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
await send('Network.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, ms = 30_000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return; await sleep(150) }
  throw new Error(`timeout waiting for ${selector}; page: ${await evaluate('location.href + " | " + document.body.innerText.slice(0, 300)')}`)
}
const goOffline = async (on) => { offline = on; await setOffline(sessionId, on); for (const w of workers) await setOffline(w, on) }
const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`)

mkdirSync(outDir, { recursive: true })
const suffix = `${locale}-${scheme}`
const shot = async (name) => {
  await evaluate(`document.querySelector('nextjs-portal')?.remove()`)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  const file = join(outDir, `a-${name}-${suffix}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  console.error(file)
}

await send('Network.setCookie', { name: 'dex_id', value: dexId, url: base, httpOnly: true, sameSite: 'Lax' })
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
const open = async (path) => {
  for (let i = 0; ; i++) {
    await send('Page.navigate', { url: `${base}/${locale}${path}` })
    try { await waitFor('[data-testid=grid] li', 40_000); return } catch (e) { if (i) throw e }
  }
}

// What the grid shows: cells, counters, seen cells in colour, and how many of the first 30 images actually decoded.
const state = () => evaluate(`(() => {
  const lis = [...document.querySelectorAll('[data-testid=grid] li')]
  const imgs = lis.slice(0, 30).map((li) => li.querySelector('img')).filter(Boolean)
  const seen = lis.filter((li) => li.querySelector('span.bg-moss'))
  return {
    url: location.pathname + location.search,
    cells: lis.length,
    counters: document.querySelector('[data-testid=counters]')?.textContent ?? null,
    seenCells: seen.length,
    seenInColour: seen.filter((li) => !li.querySelector('img')?.classList.contains('grayscale')).length,
    imgsDecoded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, imgsTried: imgs.length,
    small: lis.filter((li) => /\\/small\\.\\w+$/.test(li.querySelector('img')?.src ?? '')).length,
    medium: lis.filter((li) => /\\/medium\\.\\w+$/.test(li.querySelector('img')?.src ?? '')).length,
    firstNames: lis.slice(0, 3).map((li) => li.textContent.trim()),
    online: navigator.onLine,
    hydrated: Object.keys(document.querySelector('nav a') ?? {}).some((k) => k.startsWith('__reactFiber')),
    working: document.body.innerText.includes('Einen Moment') || document.body.innerText.includes('One moment'),
  }
})()`)
const caches = () => evaluate(`(async () => {
  const names = await caches.keys()
  const out = { controller: !!navigator.serviceWorker.controller, names }
  for (const n of names) out[n] = (await (await caches.open(n)).keys()).length
  const shell = names.find((n) => n.startsWith('dex-shell-'))
  if (shell) { const c = await caches.open(shell); out.shellPages = (await c.keys()).map((k) => new URL(k.url).pathname).filter((p) => !p.startsWith('/_next')) }
  return out
})()`)
const persisted = () => evaluate(`new Promise((r) => { const o = indexedDB.open('keyval-store'); o.onerror = () => r(null); o.onsuccess = () => { const db = o.result; if (!db.objectStoreNames.contains('keyval')) return r(null); const g = db.transaction('keyval').objectStore('keyval').get('dex.queries'); g.onsuccess = () => r(g.result ? { at: new Date(g.result.timestamp).toISOString(), queries: g.result.clientState.queries.map((q) => q.queryKey[0].join('.') + ':' + q.state.status) } : null) } })`)

const out = {}
if (mode === 'c1') {
  await open('')
  // Wait for the worker to control the page and the shell precache to land, and for the query cache to be persisted.
  const t0 = Date.now()
  while (Date.now() - t0 < 60_000) {
    const c = await caches()
    if (c.controller && c.shellPages?.includes('/de/you') && c.shellPages?.includes('/en/journal') && (await persisted())?.queries.some((q) => q.startsWith('dex.set'))) break
    await sleep(500)
  }
  const swWait = `${((Date.now() - t0) / 1000).toFixed(1)} s`
  // A second visit online, as on any real phone: now every chunk the runtime loads lazily passes through the worker.
  await send('Page.reload'); await sleep(500); await waitFor('[data-testid=grid] li')
  await sleep(2500) // images
  out.online = { ...(await state()), caches: await caches(), persisted: await persisted(), swWait }
  await shot('c1-online')

  await goOffline(true)
  out.offlineProbe = { workers: workers.size, pageFetch: await evaluate(`fetch('/api/trpc/identity.me?batch=1&input=%7B%7D').then((r) => 'ok ' + r.status, (e) => 'failed: ' + e.message)`) }
  consoleErrors.length = 0; failed.length = 0
  await send('Page.reload')
  await sleep(500)
  try { await waitFor('[data-testid=grid] li', 20_000) } catch (e) { out.offlineError = String(e.message) }
  await sleep(2500)
  out.offline = { ...(await state()), caches: await caches(), consoleErrors: consoleErrors.slice(0, 5), body: await evaluate('document.body.innerText.slice(0, 200)'),
    failed: failed.map((f) => `${f.error} ${(f.url ?? '').replace(base, '')}`).slice(0, 20),
    scripts: await evaluate(`document.querySelectorAll('script[src]').length`),
    debug: process.env.DEBUG ? await evaluate(`({ readyState: document.readyState, globals: Object.keys(window).filter((k) => /next|turbopack|react/i.test(k)), portal: document.querySelector('nextjs-portal')?.shadowRoot?.textContent?.slice(0, 600) ?? null, flight: window.__next_f?.length ?? null,
      resources: performance.getEntriesByType('resource').map((r) => [r.name.replace(location.origin, '').slice(0, 90), r.responseStatus, r.transferSize, r.deliveryType]).filter((r) => r[1] !== 200) })`) : undefined }
  await shot('c1-offline')
  // The network stays off: a Link tap to Profil renders from the persisted queries too.
  await evaluate(`document.querySelector('nav a[href$="/you"]').click()`)
  try { await waitFor('[data-testid=display-name]', 10_000); await sleep(800); out.offlineYou = { url: await evaluate('location.pathname'), counters: await text('[data-testid=counters]') } } catch (e) { out.offlineYou = { error: e.message.slice(0, 200) } }
  await shot('c1-offline-you')
  await goOffline(false)
}
console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
