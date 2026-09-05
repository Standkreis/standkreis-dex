// C5 C6 C7 and the queue shots (handoff 0009 Track B). Headless Chrome over CDP as scripts/m6a/log.mjs (no dependency);
// offline is `Network.emulateNetworkConditions {offline: true}`. The walk stays inside one document: a full navigation
// with no network needs Track A's worker, which is not in this worktree, so the tabs are tapped, never Page.navigate'd.
// usage: node scripts/m6a/log.mjs fresh                                → a dex_id
//        node scripts/m8b/queue.mjs c5|c6|c7|shots|capped <dex_id> [de|en] [light|dark] [outDir] [baseUrl]
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [mode = 'c5', dexId, locale = 'de', scheme = 'light', outDir = '.', base = 'http://localhost:3003'] = process.argv.slice(2)
if (!dexId) throw new Error('dex_id required')
const { default: pg } = await import('pg')
const db = new pg.Client(process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex')
await db.connect()
const rows = async (id) => (await db.query(`select s.id, s.at::text at, s.place, s.lat, s.lng, s.wildness, s.evidence, s.note, s."taxonId", t."commonNames"->>'de' de, (select count(*)::int from "Asset" a where a."sightingId"=s.id) photos from "Sighting" s join "Taxon" t on t.id=s."taxonId" where s."identityId"=$1 order by s."createdAt"`, [id])).rows
const progressOf = async (id) => (await db.query(`select distinct "taxonId" from "Sighting" where "identityId"=$1 and wildness='wild' order by 1`, [id])).rows.map((r) => r.taxonId)

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m8b-${port}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  target = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).then((t) => t.find((x) => x.type === 'page')).catch(() => undefined)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, ms = 30_000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return; await sleep(120) }
  throw new Error(`timeout waiting for ${selector}; page: ${await evaluate('location.href + " | " + document.body.innerText.slice(0, 300)')}`)
}
const waitGone = async (selector, ms = 10_000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (!(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))) return Date.now() - t0; await sleep(120) }
  return null
}
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
const type = async (selector, text) => {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await sleep(250)
}
const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`)
const url = () => evaluate('location.pathname + location.search')
const counters = () => text('[data-testid=counters]')
const cellState = (taxonId) => evaluate(`(() => { const li = document.querySelector('[data-taxon="${taxonId}"]'); if (!li) return null; const img = li.querySelector('img'); const box = li.querySelector('a > div'); return { fill: li.dataset.fill ?? null, own: li.dataset.own ?? null, src: img?.getAttribute('src')?.slice(0, 40) ?? null, grayscale: img ? img.className.includes('grayscale') : null, ring: box.className.includes('ring-moss'), check: !!li.querySelector('span.bg-moss') } })()`)
const nodeOf = async (selector) => { const { root } = await send('DOM.getDocument', { depth: 0 }); const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector }); return nodeId }
const setFile = async (selector, file) => send('DOM.setFileInputFiles', { nodeId: await nodeOf(selector), files: [file] })

// The outbox as the page sees it (IndexedDB `dex-outbox` / `outbox`), and a way to plant rows for the edge cases.
const OUTBOX = `(fn) => new Promise((res, rej) => { const r = indexedDB.open('dex-outbox'); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('outbox')) return res([]); const tx = db.transaction('outbox', 'readwrite'); const st = tx.objectStore('outbox'); const q = fn(st); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) }; r.onerror = () => rej(r.error) })`
const outbox = () => evaluate(`(${OUTBOX})((st) => st.getAll()).then((all) => all.map((x) => ({ id: x.id, kind: x.kind, dead: !!x.dead, attempts: x.attempts, lastError: x.lastError, blob: x.blob ? x.blob.size : null, taxonId: x.payload?.taxonId ?? null, first: x.payload?.first, photoRow: x.payload?.photoRow ?? null, photoId: x.payload?.photoId ?? null, place: x.payload?.place ?? null })))`)
const plant = (rowsJs) => evaluate(`Promise.all((${rowsJs}).map((row) => (${OUTBOX})((st) => st.put(row, row.id))))`)
const clearOutbox = () => evaluate(`(${OUTBOX})((st) => st.clear())`)

await send('Network.enable')
const offline = (on) => send('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
/** One bar, not none: the page navigates, every API call fails (`navigator.onLine` stays true, so the save waits its 3 s first). */
const oneBar = (on) => send('Network.setBlockedURLs', { urls: on ? ['*/api/*'] : [] })

mkdirSync(outDir, { recursive: true })
const suffix = `${locale}-${scheme}`
const shot = async (name) => {
  await evaluate(`document.querySelector('nextjs-portal')?.remove()`)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  const file = join(outDir, `b-${name}-${suffix}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  console.error(file)
}

await send('Network.setCookie', { name: 'dex_id', value: dexId, url: base, httpOnly: true, sameSite: 'Lax' })
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
const open = async (path, sel) => {
  for (let i = 0; ; i++) {
    await send('Page.navigate', { url: `${base}/${locale}${path}` })
    try { await waitFor(sel, 30_000); return } catch (e) { if (i) throw e }
  }
}
/** Tap a tab of the bar (client-side, so it works with no network once the route was seen online). */
const tab = async (path, sel) => { await evaluate(`document.querySelector('nav a[href="/${locale}${path}"]').click()`); await waitFor(sel) }

/** Warm the document online: grid, diary, back to the grid. Then ＋ → search → (photo) → row → save screen. */
const toSave = async ({ photo = null, pickName = null } = {}) => {
  const out = {}
  await open('', '[data-testid=grid] li')
  await tab('/journal', '[data-testid=pills], [data-testid=empty]')
  await tab('', '[data-testid=grid] li')
  await sleep(500)
  out.countersBefore = await counters()
  await click('nav button[aria-label]')
  await waitFor('[data-testid=chooser]')
  if (photo) {
    await setFile('[data-testid=photo-input-gallery]', photo)
    await waitFor('[data-testid=log-photo-strip][data-photo]', 20_000)
    out.photoId = await evaluate(`document.querySelector('[data-testid=log-photo-strip]').dataset.photo`)
  } else await click('[data-testid=choose-search]')
  await waitFor('[data-testid=log-row]')
  await sleep(400)
  if (pickName) { await type('[data-testid=log-query]', pickName); await sleep(800) }
  await click('[data-testid=log-row]')
  await waitFor('[data-testid=save-species]')
  await sleep(600)
  out.save = { species: await text('[data-testid=save-species]'), where: await text('[data-testid=save-where]'), photo: await evaluate(`document.querySelector('[data-testid=save-photo]')?.dataset.photo ?? null`), url: await url() }
  return out
}
const saveWild = async () => {
  await click('[data-testid=save-wild]')
  await waitFor('[data-testid=fill-sheet], [data-testid=toast], [data-testid=save-problem]', 20_000)
  await sleep(700)
  return { url: await url(), sheet: await evaluate(`!!document.querySelector('[data-testid=fill-sheet]')`), meta: await text('[data-testid=fill-meta]'), pendingLine: await text('[data-testid=fill-pending]'), photoButton: await evaluate(`!!document.querySelector('[data-testid=fill-photo]')`), plusOne: await evaluate(`!!document.querySelector('[data-testid=plus-one]')`), counters: await counters(), problem: await text('[data-testid=save-problem]') }
}
const diary = async () => {
  await tab('/journal', '[data-testid=row], [data-testid=empty]')
  await sleep(500)
  return evaluate(`[...document.querySelectorAll('[data-testid=row]')].map((li) => ({ kind: li.dataset.kind, queued: li.dataset.queued ?? null, link: !!li.querySelector('a'), name: li.querySelector('.font-semibold')?.textContent, chips: [...li.querySelectorAll('[data-testid=chip], [data-testid=chip-queued]')].map((c) => c.textContent), meta: li.querySelector('[data-testid=meta]')?.textContent }))`)
}
const flushWait = async (ms = 5000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { const box = await outbox(); if (!box.some((r) => !r.dead)) return { ms: Date.now() - t0, box }; await sleep(150) }
  return { ms: null, box: await outbox() }
}
const makeJpeg = async (file) => {
  const dataUrl = await evaluate(`(() => { const c = document.createElement('canvas'); c.width = 2000; c.height = 1500; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 2000, 1500); g.addColorStop(0, '#2f6b3a'); g.addColorStop(1, '#d9a441'); x.fillStyle = g; x.fillRect(0, 0, 2000, 1500); x.fillStyle = '#fff'; x.font = 'bold 140px sans-serif'; x.fillText('Offline', 300, 800); return c.toDataURL('image/jpeg', 0.9) })()`)
  writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
}

const result = {}
if (mode === 'c5') {
  // C5: offline from the save screen on; Wild · speichern → fill with "wird gesendet", counters tick, diary chip, one outbox row, no DB row.
  result.walk = await toSave()
  await offline(true)
  result.online = await evaluate('navigator.onLine')
  const t0 = Date.now()
  result.fill = await saveWild()
  result.fill.ms = Date.now() - t0
  const box = await outbox()
  result.outbox = box
  result.cell = await cellState(box[0]?.taxonId)
  await shot('fill-pending')
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`)
  await sleep(500)
  result.afterDismiss = { counters: await counters(), cell: await cellState(box[0]?.taxonId) }
  result.diary = await diary()
  await shot('journal-waiting')
  result.dbRows = await rows(dexId)
  // C6 continues in the same document: the signal returns.
  await tab('', '[data-testid=grid] li')
  await offline(false)
  result.c6 = { flush: await flushWait(5000) }
  await sleep(1200)
  result.c6.dbRows = await rows(dexId)
  result.c6.idMatches = result.c6.dbRows.some((r) => r.id === box[0]?.id)
  result.c6.fillSheetAgain = await evaluate(`!!document.querySelector('[data-testid=fill-sheet]')`)
  result.c6.url = await url()
  result.c6.counters = await counters()
  result.c6.cell = await cellState(box[0]?.taxonId)
  result.c6.diary = await diary()
  result.c6.progressClient = await evaluate(`fetch('/api/trpc/identity.progress?input=' + encodeURIComponent(JSON.stringify({ json: null, meta: { values: ['undefined'] } }))).then((r) => r.json()).then((j) => j.result.data.json.seen.sort())`)
  result.c6.progressServer = await progressOf(dexId)
} else if (mode === 'c7') {
  // C7: no API before the photo (one bar: the upload gets no answer and is queued); Galerie → search → row → save. The blob waits in the box; online it is uploaded, then the sighting created with it.
  const file = '/tmp/dex-m8b-photo.jpg'
  await open('', '[data-testid=grid] li')
  await makeJpeg(file)
  await tab('/journal', '[data-testid=pills], [data-testid=empty]')
  await tab('', '[data-testid=grid] li')
  await oneBar(true)
  result.online = await evaluate('navigator.onLine')
  result.walk = await (async () => { await click('nav button[aria-label]'); await waitFor('[data-testid=chooser]'); await setFile('[data-testid=photo-input-gallery]', file); await waitFor('[data-testid=log-photo-strip][data-photo]', 20_000); const photoId = await evaluate(`document.querySelector('[data-testid=log-photo-strip]').dataset.photo`); await waitFor('[data-testid=log-row]'); await sleep(400); await click('[data-testid=log-row]'); await waitFor('[data-testid=save-species]'); await sleep(600); return { photoId, save: { species: await text('[data-testid=save-species]'), photo: await evaluate(`document.querySelector('[data-testid=save-photo]')?.dataset.photo ?? null`), img: await evaluate(`document.querySelector('[data-testid=save-photo] img')?.getAttribute('src')?.slice(0, 5)`), url: await url() } } })()
  result.fill = await saveWild()
  result.outbox = await outbox()
  result.sheetImage = await evaluate(`document.querySelector('[data-testid=fill-sheet] img')?.getAttribute('src')?.slice(0, 5) ?? null`)
  await shot('fill-pending-photo')
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`)
  result.dbRowsOffline = await rows(dexId)
  await oneBar(false)
  await evaluate(`window.dispatchEvent(new Event('online'))`) // what the device does when the signal returns; blocked URLs do not
  result.flush = await flushWait(8000)
  await sleep(1500)
  result.dbRows = await rows(dexId)
  const asset = (await db.query(`select a.id, a.url, a."sightingId", s.evidence from "Asset" a join "Sighting" s on s.id=a."sightingId" where a."ownerId"=$1 and a.origin='user'`, [dexId])).rows
  result.asset = asset.map((a) => ({ ...a, fileExists: existsSync(join(process.cwd(), 'data', 'photos', `${a.id}.jpg`)) }))
  const taxonId = result.outbox.find((r) => r.kind === 'sighting')?.taxonId
  result.cell = await cellState(taxonId)
  await shot('grid-own-photo-after-flush')
} else if (mode === 'shots') {
  // The remaining shots: the diary with a waiting row and a refused row, the 51st save, the search cap.
  await db.query(`delete from "Sighting" where "identityId"=$1`, [dexId])
  await open('', '[data-testid=grid] li')
  await clearOutbox()
  result.walk = await toSave({ pickName: locale === 'de' ? 'Amsel' : 'blackbird' })
  await offline(true)
  result.fill = await saveWild()
  await shot('fill-pending')
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`)
  // A refused row: a sighting of a taxon the server does not know → 404 → falls out with "erneut".
  const box = await outbox()
  const taxon = await evaluate(`(${OUTBOX})((st) => st.get(${JSON.stringify(box[0].id)})).then((r) => r.payload.taxon)`)
  await plant(`[{ id: crypto.randomUUID(), kind: 'sighting', createdAt: Date.now() - 60_000, attempts: 0, lastError: null, payload: { taxonId: '00000000-0000-4000-8000-0000000000ff', at: new Date(Date.now() - 3_600_000).toISOString(), wildness: 'wild', taxon: ${JSON.stringify(taxon)}, place: null, first: false } }]`)
  await offline(false)
  await open('/journal', '[data-testid=row]') // a planted row is only seen by a fresh document; the reload online flushes: the Amsel lands, the stranger falls out
  await sleep(2500)
  result.afterFlush = await outbox()
  // Then a second waiting row next to the refused one: offline again, one more species.
  await tab('', '[data-testid=grid] li')
  await click('nav button[aria-label]')
  await waitFor('[data-testid=chooser]')
  await click('[data-testid=choose-search]')
  await waitFor('[data-testid=log-row]')
  await sleep(400)
  await click('[data-testid=log-row]')
  await waitFor('[data-testid=save-species]')
  await sleep(500)
  await offline(true)
  result.second = await saveWild()
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`)
  result.diary = await diary()
  await shot('journal-refused')
  await offline(false)
  await clearOutbox()
  // The 51st save: fifty photo rows wait, the save screen refuses the next.
  await plant(`Array.from({ length: 50 }, (_, i) => ({ id: crypto.randomUUID(), kind: 'photo', createdAt: Date.now() - i, attempts: 0, lastError: null, payload: {}, blob: new Blob(['x']) }))`)
  await open('', '[data-testid=grid] li')
  await click('nav button[aria-label]')
  await waitFor('[data-testid=chooser]')
  await click('[data-testid=choose-search]')
  await waitFor('[data-testid=log-row]')
  await sleep(400)
  await click('[data-testid=log-row]')
  await waitFor('[data-testid=save-species]')
  await sleep(500)
  result.full = await saveWild()
  await shot('save-full')
  await clearOutbox()
} else if (mode === 'capped') {
  // The search cap: 30 backbone searches in a minute go through, the 31st is refused and the screen says wait.
  await open('/log', '[data-testid=log-row]')
  const call = (q) => `fetch('/api/trpc/taxon.search?input=' + encodeURIComponent(JSON.stringify({ json: { q: ${JSON.stringify(q)}, locale: 'de' } }))).then((r) => r.status)`
  result.statuses = await evaluate(`Promise.all(Array.from({ length: 31 }, (_, i) => (${call.toString()})('kestrel' + i)).map((e) => eval(e)))`)
  await type('[data-testid=log-query]', 'Eichelhäher')
  await waitFor('[data-testid=log-capped]', 8000)
  result.screen = { capped: await text('[data-testid=log-capped]'), setRows: await evaluate(`document.querySelectorAll('[data-testid=log-row]').length`), backbone: await evaluate(`!!document.querySelector('[data-testid=log-backbone]')`) }
  await shot('search-capped')
}

console.log(JSON.stringify(result, null, 1))
ws.close()
proc.kill()
await db.end()
