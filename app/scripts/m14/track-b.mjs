// Handoff 0014 Track B, C6–C7 and the D3 spots on the production build, headless Chrome over CDP (as scripts/m14/ui.mjs).
// A fresh identity in Mainz-Bingen with two sightings of one species, one with an uploaded photo (via /api/photo and
// sighting.create), one without. Then: the ecology grid of a species with 40 items in one category (C6, D4), every ⓘ on
// the species page and three of their sheets (D3), the diary drawer for both sightings and the route for a pasted link,
// online and offline (C7, T1), the onboarding tiles' ⓘ (D3).
// usage: node scripts/m14/track-b.mjs [outDir] [baseUrl]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir = '.', base = 'http://localhost:3003'] = process.argv.slice(2)
const locale = 'de'
const regionId = process.env.REGION ?? '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const ECO_KEY = +(process.env.ECO ?? 1920506) // Pieris brassicae: 40 "wird gefressen von" in the set
const SIGHT_KEY = +(process.env.SIGHT ?? 5147038) // Idaea bilinearia: 8 lookalikes, a lead image
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base }
mkdirSync(outDir, { recursive: true })

// ── a fresh identity, two sightings: one with a photo, one without ─────────────────────────────────────────────────
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
await trpc('identity.setFilter', { regionId, tiles: ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish'], nowOnly: false })
const taxon = (await trpc('taxon.page', { gbifKey: SIGHT_KEY, regionId }, 'GET')).data
// The "own photo" is the species' reference JPEG re-uploaded through the photo route (a real JPEG, no canvas in Node).
const jpeg = await fetch(taxon.assets[0].url).then((r) => r.arrayBuffer())
const form = new FormData(); form.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'photo.jpg')
const upload = await fetch(`${base}/api/photo`, { method: 'POST', body: form, headers: { cookie } }).then((r) => r.json())
const withPhoto = crypto.randomUUID(), noPhoto = crypto.randomUUID()
const day = (h) => new Date(Date.now() - h * 3_600_000).toISOString()
out.seed = {
  taxon: taxon.sciName, photo: upload.id ? 'uploaded' : upload,
  withPhoto: (await trpc('sighting.create', { id: withPhoto, taxonId: taxon.id, at: day(2), wildness: 'wild', lat: 49.98, lng: 8.06, note: 'Am Waldrand, zwei Tiere', photoId: upload.id })).status,
  noPhoto: (await trpc('sighting.create', { id: noPhoto, taxonId: taxon.id, at: day(26), wildness: 'wild', lat: 49.97, lng: 8.05 })).status,
}

// ── Chrome over CDP, service workers attached so the offline switch reaches them (scripts/m8a/offline.mjs) ────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m14b-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const workers = new Set()
let offline = false
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
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
const [name, value] = cookie.split('=')
await send('Network.setCookie', { name, value, url: base })
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(50) }; return null }
const waitGone = async (selector, t = 5_000) => { const s = Date.now(); while (Date.now() - s < t) { if (!(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))) return Date.now() - s; await sleep(50) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `b-${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const rect = (selector) => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null })()`)
const text = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`)
const goto = async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return waitFor(sel) }
const goOffline = async (on) => { offline = on; await setOffline(sessionId, on); for (const w of workers) await setOffline(w, on) }
const scrollTo = async (selector, block = 'start') => { await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: '${block}' })`); await sleep(250) }

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

// ── C6 · the ecology grid: count on the right, three measured rows, the toggle ─────────────────────────────────────
await goto(`/species/${ECO_KEY}`, '[data-testid=ecology]')
await sleep(1000)
const gridState = () => evaluate(`(() => {
  const g = document.querySelector('[data-testid=chips-eatenBy]'); if (!g) return null
  const kids = [...g.children]; const tops = [...new Set(kids.map((k) => k.offsetTop))]
  return { chips: kids.length, rows: tops.length, gridWidth: g.clientWidth, toggle: document.querySelector('[data-testid=chips-eatenBy-toggle]')?.innerText ?? null, expanded: document.querySelector('[data-testid=chips-eatenBy-toggle]')?.getAttribute('aria-expanded') }
})()`)
out.c6 = {
  heading: await text('[data-testid=kind-eatenBy] h3'),
  count: await text('[data-testid=kind-eatenBy] [data-testid=kind-count]'),
  countRight: await evaluate(`(() => { const h = document.querySelector('[data-testid=kind-eatenBy] h3').getBoundingClientRect(), c = document.querySelector('[data-testid=kind-eatenBy] [data-testid=kind-count]').getBoundingClientRect(); return Math.round(h.right - c.right) })()`),
  folded: await gridState(),
  kinds: await evaluate(`[...document.querySelectorAll('[data-testid=ecology] [data-testid^=kind-]:not([data-testid=kind-count])')].map((k) => k.querySelector('h3').innerText.replace(/\\s+/g, ' '))`),
  sliderLeft: await evaluate(`!!document.querySelector('[data-testid=ecology] .overflow-x-auto')`),
}
await scrollTo('[data-testid=ecology]')
await shot('c6-ecology-folded')
await click('[data-testid=chips-eatenBy-toggle]'); await sleep(300)
out.c6.open = await gridState()
await scrollTo('[data-testid=chips-eatenBy-toggle]', 'end')
await shot('c6-ecology-open')
await click('[data-testid=chips-eatenBy-toggle]'); await sleep(300)
out.c6.refolded = await gridState()

// ── D3 · every ⓘ on the species page; three sheets opened ────────────────────────────────────────────────────────
await goto(`/species/${SIGHT_KEY}`, '[data-testid=sources]')
await sleep(1200)
out.d3 = { infos: await evaluate(`[...document.querySelectorAll('button[aria-haspopup=dialog][data-testid]')].map((b) => b.dataset.testid)`) }
const sheet = async (button, n) => {
  await click(button); await waitFor('[data-testid=source-sheet]')
  await sleep(250)
  const r = { rows: await evaluate(`document.querySelectorAll('[data-testid=source-sheet] [data-testid=source-row]').length`), title: await text('#source-title'), first: await evaluate(`document.querySelector('[data-testid=source-sheet] [data-testid=source-row]')?.innerText.replace(/\\n/g, ' | ')`), links: await evaluate(`[...document.querySelectorAll('[data-testid=source-sheet] a')].map((a) => a.host).filter((h, i, all) => all.indexOf(h) === i)`) }
  if (n) await shot(n)
  await evaluate(`document.querySelector('[data-testid=source-sheet]').click()`); await waitGone('[data-testid=source-sheet]')
  return r
}
out.d3.slider = await sheet('[data-testid=slider-info]', 'd3-slider-sheet')
await scrollTo('[data-testid=facts]')
out.d3.fact = await sheet('[data-testid=fact-status] [data-testid=fact-info]')
await scrollTo('[data-testid=lookalikes]')
out.d3.lookalikes = await sheet('[data-testid=lookalikes-info]', 'd3-lookalikes-sheet')
await scrollTo('[data-testid=sources]', 'end')
await shot('d3-species-bottom')
out.d3.sources = await sheet('[data-testid=sources-info]', 'd3-sources-sheet')

// ── C7 · the diary drawer for both sightings, the route for a pasted link, offline ───────────────────────────────
await goto('/journal', '[data-testid=row]')
await sleep(800)
const detail = () => evaluate(`(() => {
  const d = document.querySelector('[data-testid=sighting]'); if (!d) return null
  const q = (s) => d.querySelector(s)
  return { ownPhoto: d.dataset.ownPhoto, image: q('[data-testid=image]')?.getAttribute('src')?.slice(0, 40) ?? null, referenceTag: q('[data-testid=reference-tag]')?.innerText ?? null, addPhoto: q('[data-testid=add-photo]')?.innerText ?? null,
    heroInfo: !!q('[data-testid=hero-info]'), meta: q('[data-testid=meta]')?.innerText, toSpecies: (() => { const a = q('[data-testid=to-species]'); const r = a.getBoundingClientRect(); return { text: a.innerText, w: Math.round(r.width), bg: getComputedStyle(a).backgroundColor } })(),
    wannCount: (d.innerText.match(/\\bWann\\b/g) ?? []).length, atInput: !!q('[data-testid=at]'), sections: [...d.querySelectorAll('h2')].map((h) => h.innerText) }
})()`)
await click(`[data-testid=row] a[href$="/sighting/${withPhoto}"]`)
await waitFor('[data-testid=sighting-drawer] [data-testid=image]')
await sleep(600)
out.c7 = { drawerWithPhoto: { ...(await detail()), url: await evaluate('location.pathname'), dialog: (await rect('[data-testid=sighting-drawer] [role=dialog]')) } }
await shot('c7-drawer-own-photo')
await click('[data-testid=sighting-close]'); await waitGone('[data-testid=sighting-drawer]')
await click(`[data-testid=row] a[href$="/sighting/${noPhoto}"]`)
await waitFor('[data-testid=sighting-drawer] [data-testid=image]')
await sleep(600)
out.c7.drawerNoPhoto = await detail()
await shot('c7-drawer-reference')
// "Wann": the date in the meta line opens the field; nothing else says Wann.
await click('[data-testid=when]'); await sleep(200)
out.c7.whenOpens = { atInput: await evaluate(`!!document.querySelector('[data-testid=at]')`), value: await evaluate(`document.querySelector('[data-testid=at]')?.value`) }
// Drag the handle down: the drawer closes (G1's helper).
const h = await rect('[data-testid=sighting-handle]')
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: 1, clickCount: 1 })
await mouse('mousePressed', h.x + h.w / 2, h.y + h.h / 2)
for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', h.x + h.w / 2, h.y + h.h / 2 + i * 45); await sleep(30) }
await mouse('mouseReleased', h.x + h.w / 2, h.y + h.h / 2 + 360)
out.c7.dragClosed = (await waitGone('[data-testid=sighting-drawer]', 1500)) !== null
// The route, as a pasted link: the back link over the same detail.
await goto(`/sighting/${noPhoto}`, '[data-testid=sighting] [data-testid=image]')
await sleep(800)
out.c7.route = { ...(await detail()), back: await text('main > div:first-child a'), url: await evaluate('location.pathname') }
await shot('c7-route-reference')
// Offline: both sightings were opened online, so `journal.get` is in the persisted cache; the shell comes from the worker.
await evaluate('navigator.serviceWorker.ready.then(() => true)')
await goto('/journal', '[data-testid=row]'); await sleep(1500)
await goOffline(true)
await click(`[data-testid=row] a[href$="/sighting/${withPhoto}"]`)
const offDrawer = await waitFor('[data-testid=sighting-drawer] [data-testid=meta]', 8000)
out.c7.offline = { drawerMs: offDrawer, drawer: offDrawer !== null ? await detail() : null }
await click('[data-testid=sighting-close]'); await waitGone('[data-testid=sighting-drawer]')
await send('Page.navigate', { url: `${base}/${locale}/sighting/${noPhoto}` })
const offRoute = await waitFor('[data-testid=sighting] [data-testid=meta]', 10_000)
out.c7.offline.routeMs = offRoute
out.c7.offline.route = offRoute !== null ? await detail() : await evaluate('document.body.innerText.slice(0, 120)')
await shot('c7-route-offline')
await goOffline(false)

// ── D3 · the onboarding tiles' ⓘ ─────────────────────────────────────────────────────────────────────────────────
await goto('/onboarding?change=1', '[data-testid=regions] button')
await sleep(400)
await evaluate(`document.querySelector('[data-testid=region-next]').click()`)
await waitFor('[data-testid=tiles] button'); await sleep(1500)
out.d3.tiles = { infos: await evaluate(`[...document.querySelectorAll('[data-testid^=tile-info-]')].map((b) => b.dataset.testid)`), checkedBefore: await evaluate(`document.querySelectorAll('[data-testid=tiles] [aria-checked=true]').length`) }
await click('[data-testid=tile-info-bird]'); await waitFor('[data-testid=source-sheet]'); await sleep(250)
out.d3.tiles.sheet = { rows: await evaluate(`document.querySelectorAll('[data-testid=source-row]').length`), first: await evaluate(`document.querySelector('[data-testid=source-row]')?.innerText.replace(/\\n/g, ' | ')`) }
out.d3.tiles.checkedAfter = await evaluate(`document.querySelectorAll('[data-testid=tiles] [aria-checked=true]').length`)
await shot('d3-onboarding-tiles-sheet')

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
