// C1 C2 and the log/fill shots (handoff 0008 Track A). Headless Chrome over CDP as scripts/shot.mjs and m5a/grid.mjs (no
// dependency). `fresh` mints an identity with a Filter row for Mainz-Bingen and no sightings, so the counter starts at 0.
// usage: node scripts/m6a/log.mjs fresh
//        node scripts/m6a/log.mjs c1|c2 <dex_id> [de|en] [light|dark] [outDir] [baseUrl]
//        node scripts/m6a/log.mjs shots <dex_id> [de|en] [light|dark] [outDir] [baseUrl]   (wipes the identity's sightings first)
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [mode = 'c1', dexId, locale = 'de', scheme = 'light', outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const { default: pg } = await import('pg')
const db = new pg.Client(process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex')
await db.connect()
const rows = async (id) => (await db.query(`select s.id, s.at, s.place, s.lat, s.lng, s.wildness, s.evidence, s.note, t."commonNames"->>'de' de from "Sighting" s join "Taxon" t on t.id=s."taxonId" where s."identityId"=$1 order by s."createdAt"`, [id])).rows

if (mode === 'fresh') {
  const region = (await db.query(`select id from "Region" where name='Mainz-Bingen'`)).rows[0].id
  const id = (await db.query(`insert into "Identity" (id, "createdAt") values (gen_random_uuid(), now()) returning id`)).rows[0].id
  await db.query(`insert into "Filter" (id, "identityId", "regionId", tiles, "nowOnly", "updatedAt") values (gen_random_uuid(), $1, $2, '{}', false, now())`, [id, region])
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

// The whole flow once: ＋ → chooser → search → row → save → wild. `pickName` types a name and takes the set row; without it the first shortlist row.
const flow = async ({ pickName, shots = false, locate = false } = {}) => {
  const out = {}
  await open('', '[data-testid=grid] li')
  out.countersBefore = await counters()
  await click('nav button[aria-label]')
  await waitFor('[data-testid=chooser]')
  await sleep(300)
  if (shots) await shot('log-1-chooser')
  await click('[data-testid=choose-search]')
  await waitFor('[data-testid=log-row]')
  await sleep(shots ? 1500 : 300)
  out.shortlist = await evaluate(`[...document.querySelectorAll('[data-testid=log-row]')].map((b) => b.textContent.trim())`)
  if (shots) await shot('log-2-search-empty')
  if (pickName) {
    await type('[data-testid=log-query]', pickName)
    await sleep(1800) // debounce + GBIF
    out.results = { set: await evaluate(`[...document.querySelectorAll('[data-testid=log-row]')].map((b) => b.textContent.trim())`), backbone: await evaluate(`[...document.querySelectorAll('[data-testid=log-backbone-row]')].map((b) => b.textContent.trim())`) }
    if (shots) await shot('log-2-search-results')
  }
  await click('[data-testid=log-row]')
  await waitFor('[data-testid=save-species]')
  await sleep(shots ? 1200 : 400)
  out.save = { species: await text('[data-testid=save-species]'), when: await text('[data-testid=save-when]'), where: await text('[data-testid=save-where]') }
  if (shots) await shot('log-3-save')
  if (locate) {
    await click('[data-testid=save-locate]')
    await sleep(2500)
    out.save.afterLocate = await text('[data-testid=save-where]')
    if (shots) await shot('log-3-save-located')
  }
  await click('[data-testid=save-wild]')
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
console.log(JSON.stringify(result, null, 1))
ws.close(); proc.kill(); await db.end()
process.exit(0)
