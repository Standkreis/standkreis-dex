// C1 and the offline shots (handoff 0009 Track A). Headless Chrome over CDP as scripts/m5a and m6a (no dependency), but
// attached at the browser level: `Network.emulateNetworkConditions` on the page alone leaves the service worker's own
// fetches online, so the offline switch is applied to the page session and to every service-worker session.
// usage: node scripts/m8a/offline.mjs c1|c2|c3|c4|probe|shots <dex_id> [de|en] [light|dark] [outDir] [baseUrl]
//   c4 expects the server to be restarted with a new build between the two halves: it waits on stdin for a line.
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
// The store is superjson in localStorage (handoff 0009 Track A, moved off IndexedDB): the plain `json` half is enough here.
const persisted = () => evaluate(`(() => { const raw = localStorage.getItem('dex.queries'); if (!raw) return null; const c = JSON.parse(raw).json; return { at: new Date(c.timestamp).toISOString(), chars: raw.length, queries: c.clientState.queries.map((q) => q.queryKey[0].join('.') + ':' + q.state.status), error: localStorage.getItem('dex.persist.error') } })()`)

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

const imageBytes = () => evaluate(`(async () => { const c = await caches.open('dex-images'); const keys = await c.keys(); let bytes = 0, opaque = 0
  for (const k of keys) { const r = await c.match(k); if (r.type === 'opaque') opaque++; bytes += (await r.blob()).size }
  return { entries: keys.length, bytes, mb: +(bytes / 1048576).toFixed(2), opaque, hosts: [...new Set(keys.map((k) => new URL(k.url).hostname))] } })()`)
const swReady = async () => {
  const t0 = Date.now()
  while (Date.now() - t0 < 60_000) { const c = await caches(); if (c.controller && c.shellPages?.includes('/en/journal') && (await persisted())?.queries.some((q) => q.startsWith('dex.set'))) return; await sleep(500) }
}

if (mode === 'seq') {
  // The Simulator sequence: four pages online, a wait past staleTime, then where the store loses queries.
  await open(''); await swReady()
  for (const p of ['you', 'journal', 'log']) { await send('Page.navigate', { url: `${base}/${locale}/${p}` }); await sleep(6000); out[`after_${p}`] = (await persisted())?.queries }
  for (let i = 0; i < 14; i++) { await sleep(5000); out[`wait_${(i + 1) * 5}`] = (await persisted())?.queries.join(',') }
}
if (mode === 'probe') {
  // What the store holds after the journal was opened online, and what the journal shows offline.
  await open(''); await swReady()
  await send('Page.navigate', { url: `${base}/${locale}/journal` }); await waitFor('[data-testid=day], [data-testid=empty]'); await sleep(1500)
  out.onlinePersisted = await persisted()
  if (process.env.STALE) await sleep(65_000) // past staleTime: the offline load refetches and fails
  await goOffline(true)
  await send('Page.navigate', { url: `${base}/${locale}/journal` }); await sleep(5000)
  out.offlineJournal = { body: await evaluate('document.body.innerText.slice(0, 300)'), days: await evaluate(`document.querySelectorAll('[data-testid=day]').length`), banner: !!(await text('[data-testid=offline-banner]')) }
  out.offlinePersisted = await persisted()
  await goOffline(false)
}

if (mode === 'c2') {
  // "Für unterwegs laden" from the drawer; then offline, the whole grid scrolled; the cache measured.
  await open(''); await swReady()
  await evaluate(`document.querySelector('[data-testid=filter-button]').click()`); await waitFor('[data-testid=offline-download-drawer]')
  out.rowBefore = await text('[data-testid=offline-download-drawer-line]')
  await evaluate(`document.querySelector('[data-testid=offline-download-drawer-button]').click()`)
  await sleep(1500); out.progressEarly = await text('[data-testid=offline-download-drawer-line]')
  // Cancel and resume once: the second run must skip what the first fetched.
  await evaluate(`document.querySelector('[data-testid=offline-download-drawer-button]').click()`); await sleep(800)
  out.afterCancel = { line: await text('[data-testid=offline-download-drawer-line]'), status: await evaluate(`document.querySelector('[data-testid=offline-download-drawer]').dataset.status`), cached: (await imageBytes()).entries }
  await evaluate(`document.querySelector('[data-testid=offline-download-drawer-button]').click()`)
  const t0 = Date.now()
  while (Date.now() - t0 < 600_000 && (await evaluate(`document.querySelector('[data-testid=offline-download-drawer]').dataset.status`)) === 'running') await sleep(1000)
  out.done = { line: await text('[data-testid=offline-download-drawer-line]'), status: await evaluate(`document.querySelector('[data-testid=offline-download-drawer]').dataset.status`), seconds: +((Date.now() - t0) / 1000).toFixed(0), ready: await evaluate(`Object.keys(localStorage).filter((k) => k.startsWith('dex.offline.ready.')).map((k) => localStorage.getItem(k))`) }
  await shot('c2-drawer-ready')
  await evaluate(`document.querySelector('[data-testid=apply]').click()`); await sleep(300)
  // Profil shows the same state.
  await evaluate(`document.querySelector('nav a[href$="/you"]').click()`); await waitFor('[data-testid=offline-download]'); await sleep(500)
  out.profileLine = await text('[data-testid=offline-download-line]')
  out.cache = await imageBytes()
  await goOffline(true)
  await send('Page.navigate', { url: `${base}/${locale}` }); await sleep(500); await waitFor('[data-testid=grid] li')
  // Every tile on, then scroll the whole grid so every lazy image is asked for.
  await evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)) } window.scrollTo(0, 0) })()`)
  await sleep(2500)
  out.offlineGrid = await evaluate(`(() => { const imgs = [...document.querySelectorAll('[data-testid=grid] img')]; return { cells: document.querySelectorAll('[data-testid=grid] li').length, imgs: imgs.length, decoded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length } })()`)
  await shot('c2-offline-grid')
  await goOffline(false)
}

if (mode === 'c3') {
  const [visited, never] = (process.env.SPECIES ?? '2490719,2495455').split(',')
  await open(''); await swReady()
  // Visit one species page by Link (client navigation: only the RSC payload crosses the wire; the worker remembers the HTML).
  await evaluate(`document.querySelector('[data-testid=grid] a[href$="/species/${visited}"]')?.click() ?? (location.href = '/${locale}/species/${visited}')`)
  await waitFor('[data-testid=species]'); await waitFor('[data-testid=map]', 20_000).catch(() => null); await sleep(2500)
  out.visitedOnline = { url: await evaluate('location.pathname'), title: await text('h1'), map: !!(await text('[data-testid=map]')), mapWaits: !!(await text('[data-testid=map-waits]')) }
  const c = await caches(); out.rememberedHtml = c.shellPages?.filter((p) => p.includes('/species/'))
  if (process.env.STALE) await sleep(65_000) // past staleTime: the offline load refetches, fails, and the banner keys on it
  await goOffline(true)
  await send('Page.navigate', { url: `${base}/${locale}/species/${visited}` }); await sleep(500)
  try { await waitFor('[data-testid=species]', 15_000) } catch (e) { out.visitedOfflineError = e.message.slice(0, 200) }
  await sleep(2500)
  out.visitedOffline = { title: await text('h1'), state: await text('[data-testid=state]'), facts: !!(await text('[data-testid=facts]')), intro: (await evaluate('document.querySelector("main p[lang]")?.textContent.length')) ?? 0,
    sliderImgs: await evaluate(`[...document.querySelectorAll('main img')].filter((i) => i.complete && i.naturalWidth > 0).length`), onLine: await evaluate('navigator.onLine'), map: !!(await text('[data-testid=map]')), mapWaits: await text('[data-testid=map-waits]'), banner: await text('[data-testid=offline-banner]'), hydrated: await evaluate(`Object.keys(document.querySelector('[data-testid=study]') ?? {}).some((k) => k.startsWith('__reactFiber'))`) }
  await shot('c3-offline-visited')
  await send('Page.navigate', { url: `${base}/${locale}/species/${never}` }); await sleep(2500)
  out.neverOffline = { body: await evaluate('document.body.innerText.slice(0, 200)'), waits: !!(await evaluate(`document.body.dataset.testid === 'species-waits'`)), spinner: (await evaluate('document.body.innerText')).includes('Moment') }
  await shot('c3-offline-never')
  await evaluate(`document.querySelector('a').click()`); await sleep(500); try { await waitFor('[data-testid=grid] li', 10_000); out.backToAtlas = await evaluate('location.pathname') } catch { out.backToAtlas = 'failed' }
  await goOffline(false)
}

if (mode === 'c4') {
  await open(''); await swReady()
  await evaluate(`document.querySelector('[data-testid=filter-button]').click()`); await waitFor('[data-testid=offline-download-drawer-button]')
  await evaluate(`document.querySelector('[data-testid=offline-download-drawer-button]').click()`); await sleep(4000) // a few images, enough to see the cache survive
  out.before = { caches: await caches(), images: await imageBytes(), sw: await evaluate(`navigator.serviceWorker.controller?.scriptURL`) }
  console.error('c4: rebuild and restart the server, then press Enter')
  await new Promise((r) => process.stdin.once('data', r))
  await send('Page.navigate', { url: `${base}/${locale}` }); await waitFor('[data-testid=grid] li')
  const t0 = Date.now()
  while (Date.now() - t0 < 60_000) { const c = await caches(); if (c.names.filter((n) => n.startsWith('dex-shell-')).length === 1 && !c.names.includes(out.before.caches.names.find((n) => n.startsWith('dex-shell-'))) && c.controller) break; await sleep(500) }
  await send('Page.reload'); await sleep(500); await waitFor('[data-testid=grid] li'); await sleep(1000)
  out.after = { caches: await caches(), images: await imageBytes(), sw: await evaluate(`navigator.serviceWorker.controller?.scriptURL`), seconds: +((Date.now() - t0) / 1000).toFixed(1) }
}

if (mode === 'shots') {
  await open(''); await swReady()
  await evaluate(`document.querySelector('[data-testid=filter-button]').click()`); await waitFor('[data-testid=offline-download-drawer]'); await sleep(300)
  await evaluate(`document.querySelector('[data-testid=offline-download-drawer]').scrollIntoView({ block: 'center' })`); await sleep(300)
  await shot('drawer-download')
  await evaluate(`document.querySelector('[data-testid=apply]').click()`); await sleep(300)
  await evaluate(`document.querySelector('nav a[href$="/you"]').click()`); await waitFor('[data-testid=offline-download]'); await sleep(800)
  await shot('profile-download')
  await sleep(65_000) // past staleTime: the offline load refetches and fails, which is what the banner keys on (CDP leaves navigator.onLine true)
  await goOffline(true)
  await send('Page.navigate', { url: `${base}/${locale}` }); await sleep(500); await waitFor('[data-testid=grid] li'); await waitFor('[data-testid=offline-banner]', 10_000).catch(() => null); await sleep(2000)
  await shot('offline-banner')
  await goOffline(false)
}

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
