// Handoff 0016 Track B checks, on the production build (`npm run build` + `next start -p 3007`, PHOTO_DIR on disk, the dev
// DB with Mainz-Bingen filled, ANTHROPIC_API_KEY in the server's shell). Headless Chrome over CDP as scripts/m14/ui.mjs and
// scripts/m12/sighting.mjs; the fixture photos of docs/research/walks/01/prep go in through the hidden file inputs.
//   B-C4  the first-upload sentence on the chooser, once
//   B-C1  15.jpg (the cherry): ladder with three rungs → "Das ist es" → the save screen with species and photo → Wild → the ⓘ (B6)
//   B-C2  13.jpg (the forest scene): "several"; 10.jpg (the Schefflera): "outside", "Nein, suchen" prefilled
//   B-C3  offline (Network.emulateNetworkConditions): 12.jpg → "kein Netz", the diary row "unbestimmt" → online → the badge → the ladder → save
// usage: node scripts/m12/scan.mjs [outDir] [baseUrl]      (four paid calls, ≈ 10 ¢)
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir = '.', base = 'http://localhost:3007'] = process.argv.slice(2)
const locale = 'de'
const PREP = new URL('../../../docs/research/walks/01/prep/', import.meta.url).pathname
const photo = (n) => join(PREP, `${n}.jpg`)
const regionId = process.env.REGION ?? '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base }
mkdirSync(outDir, { recursive: true })

// ── a fresh identity with the region, as the onboarding leaves it ─────────────────────────────────────────────────
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
out.setFilter = (await trpc('identity.setFilter', { regionId, tiles: ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish'], nowOnly: false })).status

// ── Chrome over CDP, the worker attached too so the offline switch reaches it ────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m12b-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const workers = new Set()
let offline = false
const calls = []
const only = process.env.ONLY ? process.env.ONLY.split(',') : null // ONLY=c3: run that section alone (c1 and c4 share a flow)
const run = (k) => !only || only.includes(k)
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('/api/')) calls.push({ id: m.params.requestId, at: Date.now(), url: m.params.request.url.replace(base, '').split('?')[0], method: m.params.request.method })
  if (m.method === 'Network.responseReceived') { const c = calls.find((x) => x.id === m.params.requestId); if (c) c.status = m.params.response.status }
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
const [name, value] = cookie.split('=')
await send('Network.setCookie', { name, value, url: base, httpOnly: true, sameSite: 'Lax' })
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(50) }; return null }
const waitPath = async (re, t = 15_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`${re}.test(location.pathname + location.search)`)) return Date.now() - s; await sleep(50) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`)
const attr = (sel, a) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.getAttribute(${JSON.stringify(a)}) ?? null`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const goto = async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return waitFor(sel) }
const goOffline = async (on) => { offline = on; await setOffline(sessionId, on); for (const w of workers) await setOffline(w, on) }
const setFile = async (selector, path) => {
  const { root } = await send('DOM.getDocument', { depth: 0 })
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector })
  return send('DOM.setFileInputFiles', { nodeId, files: [path] })
}
const openChooser = async () => { await click('nav button[aria-label]'); await waitFor('[data-testid=chooser]'); await sleep(300) }
const ladder = () => evaluate(`(() => { const q = (s) => document.querySelector(s)?.innerText ?? null; const rungs = [...document.querySelectorAll('[data-testid^=rung-]')].map((r) => ({ rung: r.dataset.testid.slice(5), text: r.innerText.split('\\n').slice(0, 2).join(' '), delay: getComputedStyle(r).animationDelay, duration: getComputedStyle(r).animationDuration }));
  return { state: document.querySelector('[data-testid=ladder-body]')?.dataset.state, name: q('[data-testid=ladder-name]'), confidence: q('[data-testid=ladder-confidence]'), word: document.querySelector('[data-testid=ladder-confidence]')?.dataset.word, sentence: q('[data-testid=ladder-sentence]'), rungs, evidence: [...document.querySelectorAll('[data-testid=ladder-evidence] li')].map((l) => l.innerText), hint: q('[data-testid=ladder-hint]'),
    buttons: [...document.querySelectorAll('[data-testid=ladder-take], [data-testid=ladder-search], [data-testid=ladder-again], [data-testid=ladder-journal]')].map((b) => b.dataset.testid + ': ' + b.innerText), photo: !!document.querySelector('[data-testid=ladder-photo]'), percent: /\\d+\\s?%/.test(document.querySelector('[data-testid=ladder-body]')?.innerText ?? '') } })()`)
const box = (detail = false) => evaluate(`(async () => { const db = await new Promise((res, rej) => { const r = indexedDB.open('dex-outbox'); r.onsuccess = () => res(r.result); r.onerror = rej }); const rows = await new Promise((res) => { const tx = db.transaction('outbox').objectStore('outbox').getAll(); tx.onsuccess = () => res(tx.result) }); db.close()
  return rows.map((r) => ({ kind: r.kind, idPending: r.payload.idPending, photoRow: r.payload.photoRow ? 'row' : undefined, photoId: r.payload.photoId, blob: r.blob ? r.blob.size : undefined, place: r.payload.place, dead: r.dead, attempts: r.attempts, lastError: r.lastError, ladder: r.payload.ladder ? { subject: r.payload.ladder.subject, answer: r.payload.ladder.answer, confidence: r.payload.ladder.confidence, cents: r.payload.ladder.cost.cents } : ${detail ? 'null' : 'undefined'} })) })()`)
const stored = (photoId) => evaluate(`(() => { const v = localStorage.getItem('dex.scan.' + ${JSON.stringify(photoId)}); if (!v) return null; const r = JSON.parse(v); return { subject: r.subject, answer: r.answer, outside: r.outside, confidence: r.confidence, cost: r.cost, ms: r.ms } })()`)
const photoIdFromUrl = () => evaluate(`new URLSearchParams(location.search).get('photo')`)
/** Inject one photo through the chooser's camera input and wait for the ladder sheet to settle (all rungs up, or a sentence). */
const scanPhoto = async (n, input = '[data-testid=photo-input-camera]') => {
  const t0 = Date.now()
  await setFile(input, photo(n))
  const sheetMs = await waitFor('[data-testid=ladder-sheet]', 20_000)
  const busy = await evaluate(`document.querySelector('[data-testid=ladder-body]')?.dataset.state`)
  let doneMs = null
  const s = Date.now()
  while (Date.now() - s < 45_000) { const st = await evaluate(`document.querySelector('[data-testid=ladder-body]')?.dataset.state`); if (st && st !== 'busy') { doneMs = Date.now() - t0; break }; await sleep(100) }
  await sleep(900) // the three rungs are up after 220 ms × 2 + 220 ms
  return { sheetMs, firstState: busy, doneMs, photoId: await photoIdFromUrl(), url: await evaluate('location.pathname + location.search') }
}

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

if (run('c1')) {
// ── B-C4 (first half) · the chooser before any upload: the line, the sentence, the ⓘ ─────────────────────────────
await goto('/', '[data-testid=grid]'); await sleep(1200)
await openChooser()
out.c4 = { before: { line: await text('[data-testid=chooser-line]'), note: await text('[data-testid=chooser-note]'), first: await attr('[data-testid=chooser-note]', 'data-first'), infoButtons: await evaluate(`document.querySelectorAll('[data-testid=chooser] [data-testid=scan-info]').length`) } }
await shot('b-c4-chooser-first')
await click('[data-testid=chooser] [data-testid=scan-info]'); await waitFor('[data-testid=source-sheet]'); await sleep(400)
out.c4.infoSheet = await text('[data-testid=source-sheet] [role=dialog]')
await shot('b-c4-info-sheet')
await evaluate(`document.querySelector('[data-testid=source-sheet]')?.click()`); await sleep(400)

// ── B-C1 · the cherry (15): three rungs → "Das ist es" → the save screen → Wild → the ⓘ on the sighting (B6) ─────
const c1 = await scanPhoto(15)
out.c1 = { ...c1, ladder: await ladder() }
out.c1.stored = await stored(c1.photoId)
await shot('b-c1-ladder')
out.c1.takeMs = (await click('[data-testid=ladder-take]')) ? await waitPath('/\\/log\\?taxon=\\d+&photo=/') : null
await waitFor('[data-testid=save-species]'); await waitFor('[data-testid=save-photo][data-photo]'); await sleep(600)
out.c1.save = { url: await evaluate('location.pathname + location.search'), species: await text('[data-testid=save-species]'), photo: await attr('[data-testid=save-photo]', 'data-photo'), when: await text('[data-testid=save-when]') }
await shot('b-c1-save')
await click('[data-testid=save-wild]')
await waitPath('/fill=/', 15_000)
const sightingId = await evaluate(`new URLSearchParams(location.search).get('fill')`)
await waitFor('[data-testid=fill-sheet]', 10_000); await sleep(800)
out.c1.saved = { sightingId, server: (await trpc('journal.get', { id: sightingId }, 'GET')).data }
if (out.c1.saved.server) out.c1.saved.server = { evidence: out.c1.saved.server.evidence, sciName: out.c1.saved.server.taxon?.sciName, photo: !!out.c1.saved.server.photo, place: out.c1.saved.server.place }
await shot('b-c1-fill')
// B6: the sighting page, the scan line and its ⓘ
await goto(`/sighting/${sightingId}`, '[data-testid=sighting]'); await waitFor('[data-testid=scan-line]', 10_000); await sleep(600)
out.c6 = { line: await text('[data-testid=scan-line]'), note: await evaluate(`localStorage.getItem('dex.scan.s.' + ${JSON.stringify(sightingId)})`) }
await click('[data-testid=sighting-scan-info]'); await waitFor('[data-testid=source-sheet]'); await sleep(400)
out.c6.sheet = await text('[data-testid=source-sheet] [role=dialog]')
await shot('b-c6-sighting-info')

// ── B-C4 (second half) · the chooser after the first upload: no sentence, the ⓘ stays ────────────────────────────
await goto('/', '[data-testid=grid]'); await sleep(800)
await openChooser()
out.c4.after = { line: await text('[data-testid=chooser-line]'), note: await text('[data-testid=chooser-note]'), first: await attr('[data-testid=chooser-note]', 'data-first'), infoButtons: await evaluate(`document.querySelectorAll('[data-testid=chooser] [data-testid=scan-info]').length`), noted: await evaluate(`localStorage.getItem('dex.scan.noted')`) }
await shot('b-c4-chooser-after')
}

if (run('c2')) {
// ── B-C2 · several (13) and outside (10) ─────────────────────────────────────────────────────────────────────────
const c2a = await scanPhoto(13)
out.c2 = { several: { ...c2a, ladder: await ladder(), stored: await stored(c2a.photoId) } }
await shot('b-c2-several')
await click('[data-testid=ladder-search]'); await waitPath('/\\/log\\?photo=[0-9a-f-]+$/'); await sleep(400)
out.c2.several.search = { url: await evaluate('location.pathname + location.search'), query: await evaluate(`document.querySelector('[data-testid=log-query]')?.value`) }
await goto('/', '[data-testid=grid]'); await sleep(800)
await openChooser()
const c2b = await scanPhoto(10, '[data-testid=photo-input-gallery]')
out.c2.outside = { ...c2b, ladder: await ladder(), stored: await stored(c2b.photoId) }
await shot('b-c2-outside')
await click('[data-testid=ladder-search]'); await waitPath('/q=/'); await sleep(1500)
out.c2.outside.search = { url: await evaluate('location.pathname + location.search'), query: await evaluate(`document.querySelector('[data-testid=log-query]')?.value`), backboneRows: await evaluate(`[...document.querySelectorAll('[data-testid=log-backbone-row]')].map((r) => r.innerText.split('\\n')[0])`) }
await shot('b-c2-outside-search')
}

if (run('c3')) {
// ── B-C3 · offline: the mantis (12) → "kein Netz" → the diary row → online → the badge → the ladder → save ────────
await goto('/', '[data-testid=grid]'); await sleep(1000)
await openChooser()
await goOffline(true); await sleep(300)
out.c3 = { onLine: await evaluate('navigator.onLine') }
const t3 = Date.now()
await setFile('[data-testid=photo-input-camera]', photo(12))
await waitFor('[data-testid=ladder-sheet]', 20_000)
const s3 = Date.now(); while (Date.now() - s3 < 10_000) { if ((await evaluate(`document.querySelector('[data-testid=ladder-body]')?.dataset.state`)) === 'offline') break; await sleep(100) }
await sleep(300)
out.c3.offline = { ms: Date.now() - t3, url: await evaluate('location.pathname + location.search'), ladder: await ladder() }
out.c3.box = await box()
await shot('b-c3-offline')
await click('[data-testid=ladder-journal]'); await waitFor('[data-testid=scan-row]', 10_000); await sleep(500)
out.c3.journalOffline = { row: await text('[data-testid=scan-row]'), badge: await attr('[data-testid=chip-scan]', 'data-state'), scanState: await attr('[data-testid=row][data-scan]', 'data-scan') }
await shot('b-c3-journal-pending')
const t4 = Date.now()
await goOffline(false)
await sleep(1500)
await evaluate(`window.dispatchEvent(new Event('online'))`) // CDP's emulation flips navigator.onLine but fires no event; a phone fires it when the signal returns
const s4 = Date.now(); while (Date.now() - s4 < 60_000) { if ((await attr('[data-testid=chip-scan]', 'data-state')) === 'answered') break; await sleep(200) }
out.c3.online = { ms: Date.now() - t4, badge: await attr('[data-testid=chip-scan]', 'data-state'), row: await text('[data-testid=scan-row]'), calls: calls.filter((c) => c.at >= t4).map((c) => `${c.method} ${c.url} → ${c.status ?? '…'} +${c.at - t4}ms`) }
out.c3.boxAfter = await box(true)
await shot('b-c3-badge')
await click('[data-testid=scan-row]'); await waitFor('[data-testid=ladder-sheet]', 5_000); await sleep(1000)
out.c3.ladder = await ladder()
out.c3.badgeAfterOpen = await attr('[data-testid=chip-scan]', 'data-state')
await shot('b-c3-ladder')
await click('[data-testid=ladder-take]'); await waitPath('/\\/log\\?taxon=\\d+&photo=/')
await waitFor('[data-testid=save-species]'); await waitFor('[data-testid=save-photo][data-photo]'); await sleep(600)
out.c3.save = { url: await evaluate('location.pathname + location.search'), species: await text('[data-testid=save-species]'), photo: await attr('[data-testid=save-photo]', 'data-photo'), when: await text('[data-testid=save-when]') }
await shot('b-c3-save')
await click('[data-testid=save-wild]'); await waitPath('/fill=|again=/', 15_000); await sleep(1500)
const sid3 = await evaluate(`new URLSearchParams(location.search).get('fill') ?? new URLSearchParams(location.search).get('again')`)
out.c3.saved = { sightingId: sid3, server: (await trpc('journal.get', { id: sid3 }, 'GET')).data }
if (out.c3.saved.server) out.c3.saved.server = { evidence: out.c3.saved.server.evidence, sciName: out.c3.saved.server.taxon?.sciName, photo: !!out.c3.saved.server.photo, at: out.c3.saved.server.at }
out.c3.boxFinal = await box()
}

out.spendCents = [out.c1?.stored?.cost?.cents, out.c2?.several.stored?.cost?.cents, out.c2?.outside.stored?.cost?.cents, out.c3?.boxAfter?.find((r) => r.ladder)?.ladder?.cents].map((c) => c ?? 0).reduce((a, b) => a + b, 0)
console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
