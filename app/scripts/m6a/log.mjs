// C1 C2 and the log/fill shots (handoff 0008 Track A). Headless Chrome over CDP as scripts/shot.mjs and m5a/grid.mjs (no
// dependency). `fresh` mints an identity with a Filter row for Mainz-Bingen and no sightings, so the counter starts at 0.
// usage: node scripts/m6a/log.mjs fresh [--passkey]
//        node scripts/m6a/log.mjs c1|c2|c3|c4|c5|c6|c7 <dex_id> [de|en] [light|dark] [outDir] [baseUrl]
//        node scripts/m6a/log.mjs shots|shots2 <dex_id> [de|en] [light|dark] [outDir] [baseUrl]   (wipes the identity's sightings first)
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [mode = 'c1', dexId, locale = 'de', scheme = 'light', outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const { default: pg } = await import('pg')
const db = new pg.Client(process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex')
await db.connect()
const rows = async (id) => (await db.query(`select s.id, s.at::text at, s.place, s.lat, s.lng, s.wildness, s.evidence, s.note, t."commonNames"->>'de' de from "Sighting" s join "Taxon" t on t.id=s."taxonId" where s."identityId"=$1 order by s."createdAt"`, [id])).rows

if (mode === 'fresh') {
  const region = (await db.query(`select id from "Region" where name='Mainz-Bingen'`)).rows[0].id
  const id = (await db.query(`insert into "Identity" (id, "createdAt") values (gen_random_uuid(), now()) returning id`)).rows[0].id
  await db.query(`insert into "Filter" (id, "identityId", "regionId", tiles, "nowOnly", "updatedAt") values (gen_random_uuid(), $1, $2, '{}', false, now())`, [id, region])
  // --passkey: a synced identity (one Passkey row), for C7's "never sees the nudge".
  if (process.argv.includes('--passkey')) await db.query(`insert into "Passkey" (id, "identityId", "credentialId", "publicKey", counter, transports, "deviceName", "createdAt") values (gen_random_uuid(), $1, 'test-' || $1, '\\x00', 0, '{}', 'Test', now())`, [id])
  console.log(id)
  await db.end()
  process.exit(0)
}
if (!dexId) throw new Error('dex_id required')

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m6a-${port}`, 'about:blank'], { stdio: 'ignore' })
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
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
const type = async (selector, text) => {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await sleep(250)
}
const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`)
const url = () => evaluate('location.pathname + location.search')

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
const open = async (path, sel) => {
  for (let i = 0; ; i++) {
    await send('Page.navigate', { url: `${base}/${locale}${path}` })
    try { await waitFor(sel, 30_000); return } catch (e) { if (i) throw e }
  }
}
const counters = () => text('[data-testid=counters]')
const cellState = (taxonId) => evaluate(`(() => { const li = document.querySelector('[data-taxon="${taxonId}"]'); if (!li) return null; const img = li.querySelector('img'); const box = li.querySelector('a > div'); return { fill: li.dataset.fill ?? null, grayscale: img ? img.className.includes('grayscale') : null, ring: box.className.includes('ring-moss'), check: !!li.querySelector('span.bg-moss'), inView: (() => { const r = li.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight })() } })()`)

const nodeOf = async (selector) => { const { root } = await send('DOM.getDocument', { depth: 0 }); const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector }); return nodeId }
/** Set a file on one of the persistent hidden inputs: the change handler resizes, re-encodes and uploads, as a tap would. */
const setFile = async (selector, file) => send('DOM.setFileInputFiles', { nodeId: await nodeOf(selector), files: [file] })

/**
 * A JPEG with EXIF GPS for C5: the pixels come from a canvas in the page, then two APP1 segments are spliced in after SOI:
 * a TIFF/Exif block with GPSInfo (0x8825 → GPSLatitudeRef "N", GPSLatitude 49°54'0") and an XMP packet naming exif:GPSLatitude,
 * so a plain scan for "GPS" finds the input and must not find the stored file.
 */
const makeGpsJpeg = async (file) => {
  const dataUrl = await evaluate(`(() => { const c = document.createElement('canvas'); c.width = 2400; c.height = 1600; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 2400, 1600); g.addColorStop(0, '#2f6b3a'); g.addColorStop(1, '#d9a441'); x.fillStyle = g; x.fillRect(0, 0, 2400, 1600); x.fillStyle = '#fff'; x.font = 'bold 160px sans-serif'; x.fillText('Testfoto', 300, 800); return c.toDataURL('image/jpeg', 0.9) })()`)
  const jpeg = Buffer.from(dataUrl.split(',')[1], 'base64')
  const tiff = Buffer.alloc(80)
  tiff.write('II', 0); tiff.writeUInt16LE(0x2a, 2); tiff.writeUInt32LE(8, 4)
  tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x8825, 10); tiff.writeUInt16LE(4, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt32LE(26, 18); tiff.writeUInt32LE(0, 22)
  tiff.writeUInt16LE(2, 26)
  tiff.writeUInt16LE(1, 28); tiff.writeUInt16LE(2, 30); tiff.writeUInt32LE(2, 32); tiff.write('N\0', 36)
  tiff.writeUInt16LE(2, 40); tiff.writeUInt16LE(5, 42); tiff.writeUInt32LE(3, 44); tiff.writeUInt32LE(56, 48); tiff.writeUInt32LE(0, 52)
  for (const [i, v] of [49, 54, 0].entries()) { tiff.writeUInt32LE(v, 56 + i * 8); tiff.writeUInt32LE(1, 60 + i * 8) }
  const exif = Buffer.concat([Buffer.from('Exif\0\0'), tiff])
  const xmp = Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="49,54.00N" exif:GPSLongitude="8,12.00E"/></rdf:RDF></x:xmpmeta>')
  const seg = (payload) => { const len = Buffer.alloc(2); len.writeUInt16BE(payload.length + 2); return Buffer.concat([Buffer.from([0xff, 0xe1]), len, payload]) }
  writeFileSync(file, Buffer.concat([jpeg.subarray(0, 2), seg(exif), seg(xmp), jpeg.subarray(2)]))
  return jpeg.length
}
/** What a JPEG carries: its APP1 segments, and whether the bytes contain "GPS" or "Exif" anywhere. */
const inspectJpeg = (file) => {
  const b = readFileSync(file)
  const segments = []
  for (let i = 2; i + 4 <= b.length && b[i] === 0xff; ) {
    const marker = b[i + 1]
    if (marker === 0xda) break // SOS: entropy-coded data follows
    const len = b.readUInt16BE(i + 2)
    segments.push(`${marker.toString(16).toUpperCase()}${marker === 0xe1 ? ':' + b.toString('latin1', i + 4, i + 10).replace(/[^\x20-\x7e]/g, '·') : ''}`)
    i += 2 + len
  }
  const ascii = b.toString('latin1')
  return { bytes: b.length, segments, hasGPS: ascii.includes('GPS'), hasExif: ascii.includes('Exif'), gpsTag: b.indexOf(Buffer.from([0x25, 0x88])) >= 0 && ascii.includes('Exif') }
}

// The whole flow once: ＋ → chooser → search → row → save → wild. `pickName` types a name and takes the set row; without it the first shortlist row.
const flow = async ({ pickName, backbone = false, kind = 'wild', photo = null, shots = false, shotPrefix = 'log', locate = false } = {}) => {
  const out = {}
  await open('', '[data-testid=grid] li')
  out.countersBefore = await counters()
  await click('nav button[aria-label]')
  await waitFor('[data-testid=chooser]')
  await sleep(300)
  if (shots) await shot(`${shotPrefix}-1-chooser`)
  if (photo) {
    // Galerie first (spec §🎨 4): the picture is resized, re-encoded and uploaded, then the same search opens with ?photo.
    await setFile('[data-testid=photo-input-gallery]', photo)
    await waitFor('[data-testid=log-photo-strip][data-photo]', 20_000)
    out.photoId = await evaluate(`document.querySelector('[data-testid=log-photo-strip]').dataset.photo`)
  } else {
    await click('[data-testid=choose-search]')
  }
  await waitFor('[data-testid=log-row]')
  await sleep(shots ? 1500 : 300)
  out.shortlist = await evaluate(`[...document.querySelectorAll('[data-testid=log-row]')].map((b) => b.textContent.trim())`)
  if (shots) await shot(`${shotPrefix}-2-search-empty`)
  if (pickName) {
    await type('[data-testid=log-query]', pickName)
    await sleep(2500) // debounce + GBIF
    out.results = { set: await evaluate(`[...document.querySelectorAll('[data-testid=log-row]')].map((b) => b.textContent.trim())`), backbone: await evaluate(`[...document.querySelectorAll('[data-testid=log-backbone-row]')].map((b) => b.textContent.trim())`) }
    if (shots) await shot(`${shotPrefix}-2-search-results`)
  }
  await click(backbone ? '[data-testid=log-backbone-row]' : '[data-testid=log-row]')
  await waitFor('[data-testid=save-species]')
  await sleep(shots ? 1200 : 400)
  out.save = { species: await text('[data-testid=save-species]'), when: await text('[data-testid=save-when]'), where: await text('[data-testid=save-where]'), photo: await evaluate(`document.querySelector('[data-testid=save-photo]')?.dataset.photo ?? null`), url: await url() }
  if (shots) await shot(`${shotPrefix}-3-save`)
  if (locate) {
    await click('[data-testid=save-locate]')
    await sleep(2500)
    out.save.afterLocate = await text('[data-testid=save-where]')
    if (shots) await shot(`${shotPrefix}-3-save-located`)
  }
  await click(kind === 'wild' ? '[data-testid=save-wild]' : '[data-testid=save-captive]')
  await waitFor('[data-testid=fill-sheet], [data-testid=toast]', 20_000)
  out.url = await url()
  out.toast = await text('[data-testid=toast]')
  out.sheet = await evaluate(`!!document.querySelector('[data-testid=fill-sheet]')`)
  out.plusOne = await evaluate(`!!document.querySelector('[data-testid=plus-one]')`)
  out.countersAfter = await counters()
  return out
}

const result = {}
if (mode === 'c1') {
  // C1: ＋ → shortlist row → Wild · speichern, location refused (the ask is on the save screen; headless denies it).
  const r = await flow({ locate: true })
  result.flow = r
  await sleep(700)
  const dbRows = await rows(dexId)
  const taxonId = (await db.query(`select "taxonId" from "Sighting" where id=$1`, [dbRows[0].id])).rows[0].taxonId
  result.fill = { url: await url(), counters: await counters(), sheet: { name: await text('[data-testid=fill-name]'), meta: await text('[data-testid=fill-meta]'), attribution: await text('[data-testid=fill-attribution]'), photoButton: await evaluate(`!!document.querySelector('[data-testid=fill-photo]')`), species: await text('[data-testid=fill-species]') }, cell: await cellState(taxonId) }
  await shot('fill-sheet')
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`) // tap the grid dismisses
  await sleep(600)
  result.afterDismiss = { url: await url(), sheet: await evaluate(`!!document.querySelector('[data-testid=fill-sheet]')`), cell: await cellState(taxonId), counters: await counters() }
  await shot('fill-after')
  await open('/you', '[data-testid=display-name]')
  await sleep(800)
  result.profile = await evaluate(`document.body.innerText.match(/\\d+ (studiert|studied) · \\d+ (entdeckt|discovered) · \\d+ (möglich|possible)/)?.[0] ?? null`)
  result.rows = dbRows
} else if (mode === 'c2') {
  // C2: the same species again → the quiet toast, no fill, counter unchanged, two rows.
  const first = (await rows(dexId))[0]
  const r = await flow({ pickName: first.de })
  result.flow = r
  await shot('fill-again-toast')
  await sleep(3500)
  result.afterToast = { url: await url(), toast: await text('[data-testid=toast]'), counters: await counters() }
  result.rows = await rows(dexId)
} else if (mode === 'shots') {
  await db.query(`delete from "Sighting" where "identityId"=$1`, [dexId])
  const r = await flow({ pickName: locale === 'de' ? 'Eichel' : 'jay', shots: true, locate: true })
  result.flow = r
  await sleep(900)
  await shot('fill-sheet')
  const again = await flow({ pickName: locale === 'de' ? 'Eichel' : 'jay' })
  result.again = { url: again.url, toast: again.toast, sheet: again.sheet, counters: again.countersAfter }
  await shot('fill-again-toast')
  result.rows = await rows(dexId)
}
else if (mode === 'c3') {
  // C3: "Gehalten · speichern" for a species never seen wild → captive row, grey cell, counters unchanged, the toast.
  const r = await flow({ kind: 'captive' })
  result.flow = r
  const dbRows = await rows(dexId)
  const last = dbRows.at(-1)
  const taxonId = (await db.query(`select "taxonId" from "Sighting" where id=$1`, [last.id])).rows[0].taxonId
  result.cell = await cellState(taxonId)
  await shot('captive-toast')
  await sleep(3500)
  result.afterToast = { url: await url(), toast: await text('[data-testid=toast]'), counters: await counters(), cell: await cellState(taxonId) }
  result.rows = dbRows
} else if (mode === 'c4') {
  // C4: a species outside the set through the backbone; the cell sits at the bottom with the tile icon; the content kick fills the page.
  const t0 = Date.now()
  const r = await flow({ pickName: 'Eichenprozessionsspinner', backbone: true })
  result.flow = r
  await sleep(800)
  const dbRows = await rows(dexId)
  const s = (await db.query(`select s."taxonId", t."gbifKey", t."contentAt" from "Sighting" s join "Taxon" t on t.id=s."taxonId" where s.id=$1`, [dbRows.at(-1).id])).rows[0]
  result.fill = { url: await url(), counters: await counters(), sheet: { name: await text('[data-testid=fill-name]'), attribution: await text('[data-testid=fill-attribution]') }, cell: await cellState(s.taxonId), plusOne: await evaluate(`!!document.querySelector('[data-testid=plus-one]')`) }
  result.cellPosition = await evaluate(`(() => { const all = [...document.querySelectorAll('[data-testid=grid] li')]; const i = all.findIndex((li) => li.dataset.taxon === '${s.taxonId}'); return { index: i, of: all.length, outside: all[i]?.dataset.outside ?? null, hasImg: !!all[i]?.querySelector('img'), silhouette: !!all[i]?.querySelector('svg') } })()`)
  await shot('outside-fill')
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`)
  await sleep(500)
  await shot('outside-cell')
  // Wait for the in-process content kick (≤ 2 min), then read the page and the grid again.
  let contentAt = null
  while (!contentAt && Date.now() - t0 < 150_000) { await sleep(3000); contentAt = (await db.query(`select "contentAt" from "Taxon" where "gbifKey"=$1`, [s.gbifKey])).rows[0].contentAt }
  result.content = { gbifKey: s.gbifKey, seconds: +((Date.now() - t0) / 1000).toFixed(1), contentAt, taxon: (await db.query(`select "commonNames", intro->>'lang' lang, length(intro->>'text') "introLen", (select count(*) from "Asset" a where a."taxonId"=t.id and a."sightingId" is null) images from "Taxon" t where "gbifKey"=$1`, [s.gbifKey])).rows[0] }
  await open(`/species/${s.gbifKey}`, '[data-testid=species] h1')
  await sleep(2500)
  result.page = { title: await text('[data-testid=species] h1'), state: await text('[data-testid=state]'), intro: (await evaluate(`document.querySelector('[data-testid=species] p[lang]')?.textContent ?? null`))?.slice(0, 80) ?? null, slides: await evaluate(`document.querySelectorAll('[data-testid=species] img').length`), rare: await text('[data-testid=rare]') }
  await shot('outside-page')
  await open('', '[data-testid=grid] li')
  await sleep(1500)
  result.cellAfter = await evaluate(`(() => { const all = [...document.querySelectorAll('[data-testid=grid] li')]; const i = all.findIndex((li) => li.dataset.taxon === '${s.taxonId}'); const img = all[i]?.querySelector('img'); return { index: i, of: all.length, hasImg: !!img, grayscale: img ? img.className.includes('grayscale') : null, name: all[i]?.textContent } })()`)
  result.setSize = (await db.query(`select count(*)::int n from "Plausibility" p join "Region" r on r.id=p."regionId" where r.name='Mainz-Bingen'`)).rows[0].n
  result.inSet = (await db.query(`select count(*)::int n from "Plausibility" p join "Taxon" t on t.id=p."taxonId" where t."gbifKey"=$1`, [s.gbifKey])).rows[0].n
  await shot('outside-cell-after')
} else if (mode === 'c5') {
  // C5: Galerie → a JPEG with EXIF GPS → save. The stored file has no APP1, no "GPS", the cell shows the own photo in colour, the sheet has no Foto button.
  await open('', '[data-testid=grid] li')
  const src = `/tmp/dex-gps-${port}.jpg`
  await makeGpsJpeg(src)
  result.source = inspectJpeg(src)
  const r = await flow({ photo: src, locate: true })
  result.flow = r
  await sleep(700)
  const dbRows = await rows(dexId)
  const last = dbRows.at(-1)
  const taxonId = (await db.query(`select "taxonId" from "Sighting" where id=$1`, [last.id])).rows[0].taxonId
  const asset = (await db.query(`select id, url, author, licence, "sourceUrl", origin, "ownerId"=$2 owned from "Asset" where "sightingId"=$1`, [last.id, dexId])).rows[0]
  const file = join(process.cwd(), 'data', 'photos', `${asset.id}.jpg`)
  result.stored = { file: file.replace(process.cwd(), 'app'), exists: existsSync(file), ...(existsSync(file) ? inspectJpeg(file) : {}), asset }
  result.dims = await evaluate(`new Promise((r) => { const i = new Image(); i.onload = () => r(i.naturalWidth + 'x' + i.naturalHeight); i.onerror = () => r('error'); i.src = '${asset.url}' })`)
  result.fill = { url: await url(), sheet: { name: await text('[data-testid=fill-name]'), attribution: await text('[data-testid=fill-attribution]'), photoButton: await evaluate(`!!document.querySelector('[data-testid=fill-photo]')`), image: await evaluate(`document.querySelector('[data-testid=fill-sheet] img')?.getAttribute('src')`) }, cell: await cellState(taxonId), cellSrc: await evaluate(`document.querySelector('[data-taxon="${taxonId}"] img')?.getAttribute('src')`), own: await evaluate(`document.querySelector('[data-taxon="${taxonId}"]')?.dataset.own ?? null`) }
  await shot('fill-sheet-own-photo')
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`)
  await sleep(500)
  await shot('grid-own-photo')
  result.rows = dbRows
} else if (mode === 'c6') {
  // C6: "Entdeckt" on the Amsel page with location allowed (Nieder-Olm) → preset save screen → fill → state row with the date; a repeat → the toast on the page.
  await send('Browser.grantPermissions', { permissions: ['geolocation'], origin: base })
  await send('Emulation.setGeolocationOverride', { latitude: 49.9097, longitude: 8.2014, accuracy: 15 })
  const amsel = (await db.query(`select "gbifKey", id from "Taxon" where "sciName"='Turdus merula'`)).rows[0]
  await open(`/species/${amsel.gbifKey}`, '[data-testid=log]')
  await sleep(1200)
  result.before = { state: await text('[data-testid=state]'), bar: await evaluate(`[...document.querySelectorAll('[data-testid=log], [data-testid=study]')].map((b) => b.textContent.trim())`) }
  await shot('species-bar')
  await click('[data-testid=log]')
  await waitFor('[data-testid=save-species]')
  await sleep(3000) // the granted location is taken silently, then the Gemeinde
  result.save = { url: await url(), species: await text('[data-testid=save-species]'), where: await text('[data-testid=save-where]') }
  await shot('species-save')
  await click('[data-testid=save-wild]')
  await waitFor('[data-testid=fill-sheet], [data-testid=toast]', 20_000)
  await sleep(700)
  result.after = { url: await url(), sheet: await evaluate(`!!document.querySelector('[data-testid=fill-sheet]')`), meta: await text('[data-testid=fill-meta]'), toast: await text('[data-testid=toast]'), cell: await cellState(amsel.id) }
  await open(`/species/${amsel.gbifKey}`, '[data-testid=log]')
  await sleep(1500)
  result.page = { state: await text('[data-testid=state]'), bar: await evaluate(`[...document.querySelectorAll('[data-testid=log], [data-testid=study]')].map((b) => b.textContent.trim())`) }
  await shot('species-seen')
  // The repeat from the page: back on the page with the toast, no fill.
  await click('[data-testid=log]')
  await waitFor('[data-testid=save-species]')
  await sleep(2500)
  await click('[data-testid=save-wild]')
  await waitFor('[data-testid=toast]', 20_000)
  await sleep(300)
  result.again = { url: await url(), toast: await text('[data-testid=toast]'), state: await text('[data-testid=state]') }
  await shot('species-again-toast')
  result.rows = await rows(dexId)
} else if (mode === 'c7') {
  // C7: first wild sighting on a fresh identity → dismiss the fill sheet → the nudge once; "Später" and a reload never show it again.
  const r = await flow({ locate: false })
  result.flow = r
  await sleep(700)
  result.passkeys = (await db.query(`select count(*)::int n from "Passkey" where "identityId"=$1`, [dexId])).rows[0].n
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`)
  await sleep(600)
  result.nudge = { shown: await evaluate(`!!document.querySelector('[data-testid=nudge]')`), text: await text('[data-testid=nudge]'), url: await url() }
  if (result.nudge.shown) {
    await shot('nudge')
    await click('[data-testid=nudge-later]')
    await sleep(400)
    result.afterLater = { shown: await evaluate(`!!document.querySelector('[data-testid=nudge]')`), flag: await evaluate(`localStorage.getItem('dex.nudge.passkey')`) }
  }
  await open('', '[data-testid=grid] li')
  await sleep(1200)
  result.afterReload = { shown: await evaluate(`!!document.querySelector('[data-testid=nudge]')`), url: await url() }
  // A second fill on the same identity (a second species): the sheet again, the nudge never.
  const r2 = await flow({ pickName: null })
  result.second = { url: r2.url, sheet: r2.sheet }
  await sleep(700)
  await evaluate(`document.querySelector('[data-testid=fill-sheet]')?.parentElement.click()`)
  await sleep(600)
  result.secondNudge = await evaluate(`!!document.querySelector('[data-testid=nudge]')`)
  result.rows = await rows(dexId)
} else if (mode === 'shots2') {
  // The second half's screens: photo strip, save with photo, own-photo fill sheet and grid cell, the nudge, the species bar and state, the out-of-set cell.
  await db.query(`delete from "Sighting" where "identityId"=$1`, [dexId])
  await db.query(`delete from "Asset" where "ownerId"=$1`, [dexId])
  await open('', '[data-testid=grid] li')
  const src = `/tmp/dex-gps-${port}.jpg`
  await makeGpsJpeg(src)
  const r = await flow({ photo: src, pickName: locale === 'de' ? 'Eichel' : 'jay', shots: true, shotPrefix: 'photo', locate: true })
  result.flow = r
  await sleep(900)
  await shot('fill-sheet-own-photo')
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`)
  await sleep(600)
  result.nudge = await evaluate(`!!document.querySelector('[data-testid=nudge]')`)
  if (result.nudge) { await shot('nudge'); await click('[data-testid=nudge-later]'); await sleep(400) }
  await shot('grid-own-photo')
  const amsel = (await db.query(`select "gbifKey", id from "Taxon" where "sciName"='Turdus merula'`)).rows[0]
  await open(`/species/${amsel.gbifKey}`, '[data-testid=log]')
  await sleep(1500)
  await shot('species-bar')
  await click('[data-testid=log]')
  await waitFor('[data-testid=save-species]')
  await sleep(1500)
  await click('[data-testid=save-wild]')
  await waitFor('[data-testid=fill-sheet]', 20_000)
  await open(`/species/${amsel.gbifKey}`, '[data-testid=log]')
  await sleep(1500)
  await shot('species-seen')
  await click('[data-testid=log]')
  await waitFor('[data-testid=save-species]')
  await sleep(1500)
  await click('[data-testid=save-wild]')
  await waitFor('[data-testid=toast]', 20_000)
  await sleep(300)
  await shot('species-again-toast')
  const r3 = await flow({ kind: 'captive' })
  result.captive = { url: r3.url, toast: r3.toast }
  await shot('captive-toast')
  const r2 = await flow({ pickName: 'Eichenprozessionsspinner', backbone: true })
  result.outside = { url: r2.url, sheet: r2.sheet }
  await sleep(900)
  await shot('outside-fill')
  await evaluate(`document.querySelector('[data-testid=fill-sheet]').parentElement.click()`)
  await sleep(500)
  await shot('outside-cell')
  result.rows = await rows(dexId)
}
console.log(JSON.stringify(result, null, 1))
ws.close(); proc.kill(); await db.end()
process.exit(0)
