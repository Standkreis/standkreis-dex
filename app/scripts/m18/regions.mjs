// Handoff 0018, C2–C5 on the production build, headless Chrome over CDP (as scripts/m14/ui.mjs; the offline half as
// scripts/m8a/offline.mjs: the switch is applied to the page session and to every service-worker session).
// A fresh identity in Mainz-Bingen, then: profile → sheet → add Schagen → tap it (C2: atlas 902 möglich, the diary's
// place, the log search's shortlist), the refusals (C3), the scan after the switch with `sighting.identify` mocked over
// CDP `Fetch` (C5), the sheet and the switch without network (C4).
// usage: node scripts/m18/regions.mjs [outDir] [baseUrl]
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir = '.', base = 'http://localhost:3008'] = process.argv.slice(2)
const locale = process.env.LOCALE ?? 'de' // LOCALE=en SHEET_ONLY=1: one shot of the sheet in English
const MB = '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const SCHAGEN = '67303e90-4569-4019-a36d-6c99b09b1de8'
const KYOTO = 'bf69dbef-a7e8-42c0-a025-7ed60aecb601'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base }
mkdirSync(outDir, { recursive: true })

// ── a fresh identity in Mainz-Bingen ───────────────────────────────────────────────────────────────────────────────
let cookie = ''
const trpc = async (path, input, method = 'POST') => {
  const r = method === 'GET'
    ? await fetch(`${base}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input ?? null } }))}`, { headers: { cookie } })
    : await fetch(`${base}/api/trpc/${path}?batch=1`, { method, headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ 0: { json: input } }) })
  const set = r.headers.get('set-cookie'); if (set && !cookie) cookie = set.split(';')[0]
  const j = await r.json()
  return { status: r.status, ...(j[0].result?.data?.json !== undefined ? { data: j[0].result.data.json } : { error: j[0].error?.json?.message }) }
}
const tiles = ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish']
await trpc('identity.me', undefined, 'GET')
out.seed = { setFilter: await trpc('identity.setFilter', { regionId: MB, regionIds: [MB], tiles, nowOnly: false }) }
const me = () => trpc('identity.me', undefined, 'GET').then((r) => ({ region: r.data?.region?.name, regionIds: r.data?.regionIds }))
out.seed.me = await me()
const setOf = async (regionId) => (await trpc('dex.set', { regionId, tiles, nowOnly: false }, 'GET')).data
const mbSet = await setOf(MB), schagenSet = await setOf(SCHAGEN)
out.seed.sets = { mainzBingen: mbSet.setSize, schagen: schagenSet.setSize }

// ── Chrome over CDP, service workers attached ─────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m18-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const workers = new Set()
let offline = false
const identifyCalls = [] // C5: the bodies of the intercepted `sighting.identify` requests
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); return }
  if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'service_worker') {
    workers.add(m.params.sessionId)
    raw('Network.enable', {}, m.params.sessionId).then(() => (offline ? setOffline(m.params.sessionId, true) : null))
  }
  if (m.method === 'Target.detachedFromTarget') workers.delete(m.params.sessionId)
  if (m.method === 'Fetch.requestPaused') {
    const req = m.params.request
    identifyCalls.push(JSON.parse(req.postData ?? '{}'))
    const body = [{ result: { data: { json: { subject: 'single', answer: null, outside: 'Vulpes vulpes', confidence: 0.4, ladder: { family: 'Canidae', genus: 'Vulpes', species: null }, evidence: ['Mock: buschiger Schwanz'], hint: null, cost: { input: 0, cacheWrite: 0, cached: 0, output: 0, cents: 0 }, ms: 1 } } } }]
    raw('Fetch.fulfillRequest', { requestId: m.params.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') }, m.sessionId)
  }
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
const waitText = async (selector, re, t = 15_000) => { const s = Date.now(); while (Date.now() - s < t) { const v = await text(selector); if (v && re.test(v)) return Date.now() - s; await sleep(50) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const text = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const goto = async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return waitFor(sel) }
const goOffline = async (on) => { offline = on; await setOffline(sessionId, on); for (const w of workers) await setOffline(w, on) }
const rows = () => evaluate(`[...document.querySelectorAll('[data-testid=region-row]')].map((li) => ({ id: li.dataset.region, name: li.querySelector('[data-testid=region-row-name]')?.innerText, sub: li.querySelector('[data-testid=region-row-counts]')?.innerText, active: li.dataset.active === 'true', inList: li.dataset.inList === 'true', checked: li.querySelector('[data-testid=region-check]')?.getAttribute('aria-checked'), radio: li.querySelector('[data-testid=region-pick]')?.getAttribute('aria-checked'), dot: (() => { const d = li.querySelector('[data-testid=region-pick] > span > span'); return d ? getComputedStyle(d).backgroundColor : null })(), ring: getComputedStyle(li).boxShadow }))`)
const row = (regionId) => `[data-testid=region-row][data-region="${regionId}"]`
const openSheetFrom = async (trigger) => { await click(trigger); await waitFor('[data-testid=region-sheet]'); await sleep(400) }
const closeSheet = async () => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await waitGone('[data-testid=region-sheet]') }

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

// ── C2 · profile → sheet → add Schagen → tap it → atlas, diary, log search ────────────────────────────────────────
await goto('/you', '[data-testid=change-region]')
await sleep(800)
out.c2 = { profileBefore: await text('[data-testid=region-name]'), changeIsLink: await evaluate(`document.querySelector('[data-testid=change-region]').tagName`) }
await openSheetFrom('[data-testid=change-region]')
out.c2.sheetRows = await rows()
await shot('c2-sheet-profile')
if (process.env.SHEET_ONLY) { console.log(JSON.stringify(out, null, 2)); ws.close(); proc.kill(); process.exit(0) }
await click(`${row(SCHAGEN)} [data-testid=region-check]`)
await waitFor(`${row(SCHAGEN)}[data-in-list]`, 10_000); await sleep(300)
out.c2.afterAdd = { rows: await rows(), server: await me() }
await shot('c2-sheet-added')
await click(`${row(SCHAGEN)} [data-testid=region-pick]`)
out.c2.sheetClosedMs = await waitGone('[data-testid=region-sheet]')
await waitText('[data-testid=region-name]', /Schagen/)
await sleep(300)
out.c2.profileAfter = { region: await text('[data-testid=region-name]'), server: await me() }
await shot('c2-profile-schagen')
await goto('/', '[data-testid=grid]')
await sleep(1500)
out.c2.atlas = { header: await text('[data-testid=region-switch-name]'), counters: await text('[data-testid=counters]'), headerChevron: await evaluate(`!!document.querySelector('[data-testid=region-switch] svg')`) }
await shot('c2-atlas-schagen')
await openSheetFrom('[data-testid=region-switch]')
out.c2.atlasSheet = { rows: (await rows()).map((r) => ({ name: r.name, active: r.active, inList: r.inList })), z: await evaluate(`getComputedStyle(document.querySelector('[data-testid=region-sheet]')).zIndex`) }
await shot('c2-sheet-atlas')
await closeSheet()
await click('[data-testid=filter-button]'); await waitFor('[data-testid=drawer]'); await sleep(300)
out.c2.drawerRegion = await evaluate(`document.querySelector('[data-testid=drawer] [data-testid=change-region]').closest('section').innerText.split('\\n').slice(0, 3).join(' | ')`)
await openSheetFrom('[data-testid=drawer] [data-testid=change-region]')
out.c2.drawerSheet = { open: !!(await waitFor('[data-testid=region-sheet]', 1000)), drawerStillThere: await evaluate(`!!document.querySelector('[data-testid=drawer]')`) }
await shot('c2-sheet-over-drawer')
await closeSheet(); await closeSheet()
// The log search's shortlist: eight rows of the active set in "jetzt wahrscheinlich" order, none seen.
await goto('/log', '[data-testid=log-set] [data-testid=log-row]')
await sleep(800)
const shortlist = await evaluate(`[...document.querySelectorAll('[data-testid=log-row]')].map((b) => b.querySelector('span span')?.innerText)`)
const nameOf = (s) => s.names.de ?? s.names.en ?? s.sciName
out.c2.logSearch = { shortlist, expectedSchagen: schagenSet.species.slice(0, 8).map(nameOf), inSchagen: shortlist.filter((n) => schagenSet.species.some((s) => nameOf(s) === n)).length, inMainzBingenTop8: shortlist.filter((n) => mbSet.species.slice(0, 8).some((s) => nameOf(s) === n)).length }
await shot('c2-log-schagen')
// The diary: a sighting logged after the switch carries the active region as its place (sighting.ts: no point → the filter's region).
const target = schagenSet.species.find((s) => !mbSet.species.some((m) => m.taxonId === s.taxonId))
out.c2.sighting = { taxon: target.sciName, ...(await trpc('sighting.create', { taxonId: target.taxonId, at: new Date().toISOString(), wildness: 'wild' })) }
await goto('/journal', '[data-testid=day]')
await sleep(800)
out.c2.journal = { day: await evaluate(`document.querySelector('[data-testid=day]')?.innerText.split('\\n').slice(0, 4).join(' | ')`) }
await shot('c2-journal-schagen')

// ── C3 · the refusals: the active one, the last one; the server refuses too ──────────────────────────────────────
await goto('/you', '[data-testid=change-region]')
await sleep(600)
await openSheetFrom('[data-testid=change-region]')
await click(`${row(SCHAGEN)} [data-testid=region-check]`) // Schagen is active
await sleep(300)
out.c3 = { removeActive: { line: await text('[data-testid=region-line]'), rows: (await rows()).map((r) => ({ name: r.name, active: r.active, inList: r.inList })), server: await me() } }
await shot('c3-refused-active')
await click(`${row(MB)} [data-testid=region-pick]`) // back to Mainz-Bingen
await waitGone('[data-testid=region-sheet]')
await waitText('[data-testid=region-name]', /Mainz-Bingen/)
await openSheetFrom('[data-testid=change-region]')
await click(`${row(SCHAGEN)} [data-testid=region-check]`) // now Schagen can go
await waitFor(`${row(SCHAGEN)}:not([data-in-list])`, 10_000); await sleep(300)
out.c3.removeSchagen = { rows: (await rows()).map((r) => ({ name: r.name, active: r.active, inList: r.inList })), server: await me() }
await click(`${row(MB)} [data-testid=region-check]`) // the last one
await sleep(300)
out.c3.removeLast = { line: await text('[data-testid=region-line]'), server: await me() }
await shot('c3-refused-last')
await closeSheet()
out.c3.server = {
  activeNotInList: await trpc('identity.setFilter', { regionId: MB, regionIds: [SCHAGEN] }),
  emptyList: await trpc('identity.setFilter', { regionId: MB, regionIds: [] }),
  unknownRegion: await trpc('identity.setFilter', { regionId: MB, regionIds: [MB, '00000000-0000-4000-8000-000000000000'] }),
  switchOutsideList: await trpc('identity.setRegion', { regionId: KYOTO }),
  tilesWithoutList: await trpc('identity.setFilter', { regionId: MB, tiles: ['bird'], nowOnly: false }),
  after: await me(),
}
await trpc('identity.setFilter', { regionId: MB, regionIds: [MB], tiles, nowOnly: false })

// ── C5 · the scan after the switch: `sighting.identify` mocked over CDP, the request's regionId and the sentence ─
out.c5 = {}
await goto('/you', '[data-testid=change-region]'); await sleep(600)
await openSheetFrom('[data-testid=change-region]')
await click(`${row(SCHAGEN)} [data-testid=region-pick]`) // not in the list: one tap adds it and makes it active
await waitGone('[data-testid=region-sheet]')
out.c5.switched = { profileMs: await waitText('[data-testid=region-name]', /Schagen/), server: await me() }
const form = new FormData()
form.append('file', new Blob([readFileSync(new URL('../../public/splash.jpg', import.meta.url))], { type: 'image/jpeg' }), 'splash.jpg')
const photo = await fetch(`${base}/api/photo`, { method: 'POST', headers: { cookie }, body: form }).then((r) => r.json())
await send('Fetch.enable', { patterns: [{ urlPattern: '*sighting.identify*', requestStage: 'Request' }] })
await goto(`/log?photo=${photo.id}&scan=1`, '[data-testid=ladder-sentence]')
await waitText('[data-testid=ladder-sentence]', /Atlas/, 10_000)
await sleep(400)
out.c5 = { photo: photo.id, identifyCalls, sentence: await text('[data-testid=ladder-sentence]'), stripRegion: await text('[data-testid=log-photo-strip]') }
await shot('c5-scan-schagen')
await send('Fetch.disable')

// ── C4 · without network: the sheet from cache, the switch to a cached set, "erst online laden" for an uncached one ─
// Online first: the list is [Mainz-Bingen, Schagen, Kyoto], Mainz-Bingen active; the sets of Mainz-Bingen and Schagen
// are in the persisted cache (both were on screen), Kyoto's never was.
await goto('/', '[data-testid=grid]'); await sleep(1500)
await openSheetFrom('[data-testid=region-switch]')
await click(`${row(KYOTO)} [data-testid=region-check]`); await waitFor(`${row(KYOTO)}[data-in-list]`, 10_000)
await click(`${row(MB)} [data-testid=region-pick]`); await waitGone('[data-testid=region-sheet]')
await waitText('[data-testid=region-switch-name]', /Mainz-Bingen/); await sleep(1500)
out.c4 = { setup: await me() }
for (let i = 0; i < 50 && !(await evaluate('!!navigator.serviceWorker.controller')); i++) await sleep(200)
Object.assign(out.c4, { controller: await evaluate('!!navigator.serviceWorker.controller'), workers: workers.size, cachedSets: await evaluate(`(() => { const q = JSON.parse(localStorage.getItem('dex.queries')).json.clientState.queries; return q.filter((x) => x.queryKey[0][0] === 'dex').map((x) => x.queryKey[0][1] + ':' + (x.queryKey[1]?.input?.regionId ?? '').slice(0, 8)) })()`) })
await goOffline(true)
out.c4.pageFetch = await evaluate(`fetch('/api/trpc/identity.me?batch=1&input=%7B%7D').then((r) => 'ok ' + r.status, (e) => 'failed: ' + e.message)`)
await send('Page.reload')
out.c4.gridOfflineMs = await waitFor('[data-testid=grid]', 20_000)
await sleep(800)
out.c4.banner = await text('[data-testid=offline-banner]')
await openSheetFrom('[data-testid=region-switch]')
out.c4.sheetRows = (await rows()).map((r) => ({ name: r.name, active: r.active, inList: r.inList, sub: r.sub }))
out.c4.waits = await evaluate(`[...document.querySelectorAll('[data-testid=region-waits]')].map((e) => e.closest('[data-testid=region-row]').dataset.region.slice(0, 8) + ': ' + e.innerText)`)
await shot('c4-offline-sheet')
await click(`${row(KYOTO)} [data-testid=region-pick]`)
await sleep(300)
out.c4.kyoto = { line: await text('[data-testid=region-line]'), sheetStillOpen: !!(await evaluate(`document.querySelector('[data-testid=region-sheet]')`)), header: await text('[data-testid=region-switch-name]') }
await shot('c4-offline-uncached')
await click(`${row(SCHAGEN)} [data-testid=region-pick]`)
out.c4.schagen = { closedMs: await waitGone('[data-testid=region-sheet]'), headerMs: await waitText('[data-testid=region-switch-name]', /Schagen/, 5000) }
await sleep(600)
out.c4.schagen.counters = await text('[data-testid=counters]')
out.c4.schagen.pending = await evaluate(`localStorage.getItem('dex.region.pending')`)
await shot('c4-offline-switched')
await send('Page.reload'); await waitFor('[data-testid=grid]', 20_000); await sleep(800)
out.c4.afterReload = { header: await text('[data-testid=region-switch-name]'), counters: await text('[data-testid=counters]'), serverStill: await me() }
await goOffline(false)
await evaluate(`window.dispatchEvent(new Event('online'))`)
for (let i = 0; i < 50 && (await evaluate(`localStorage.getItem('dex.region.pending')`)); i++) await sleep(200)
out.c4.replayed = { pending: await evaluate(`localStorage.getItem('dex.region.pending')`), server: await me(), header: await text('[data-testid=region-switch-name]') }

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
