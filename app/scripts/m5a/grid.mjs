// C3 C4 C5 and the grid shots (handoff 0007 Track A). A headless Chrome (CDP, no dependency, see scripts/shot.mjs) with a
// dex_id cookie for an identity that already has a region; `seed` first gives that identity a few studied and seen rows
// so the three cell states show. Prints the check numbers as JSON.
// usage: node scripts/m5a/grid.mjs <seed|shots|checks> <dex_id> [de|en] [light|dark] [390|360] [outDir] [baseUrl]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [mode = 'checks', dexId, locale = 'de', scheme = 'light', widthArg = '390', outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
if (!dexId) throw new Error('dex_id required')
const width = Number(widthArg)

if (mode === 'seed') {
  const { default: pg } = await import('pg')
  const c = new pg.Client(process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex')
  await c.connect()
  const region = (await c.query(`select "regionId" from "Filter" where "identityId"=$1`, [dexId])).rows[0]?.regionId
  const byName = async (de) => (await c.query(`select t.id from "Taxon" t join "Plausibility" p on p."taxonId"=t.id where p."regionId"=$1 and t."commonNames"->>'de'=$2`, [region, de])).rows[0]?.id
  const studied = ['Amsel', 'Rotmilan', 'Hornisse', 'Tagpfauenauge', 'Erdkröte']
  const seen = [['Amsel', '2026-09-01T08:00:00Z'], ['Eichhörnchen', '2026-08-20T10:00:00Z'], ['Admiral', '2026-09-03T15:00:00Z'], ['Brombeere', '2026-07-12T09:00:00Z'], ['Große Brennnessel', '2026-06-02T09:00:00Z']]
  await c.query(`delete from "Study" where "identityId"=$1`, [dexId])
  await c.query(`delete from "Sighting" where "identityId"=$1`, [dexId])
  for (const n of studied) { const id = await byName(n); if (id) await c.query(`insert into "Study" ("id","identityId","taxonId") values (gen_random_uuid(),$1,$2)`, [dexId, id]) }
  for (const [n, at] of seen) { const id = await byName(n); if (id) await c.query(`insert into "Sighting" ("id","identityId","taxonId","at","wildness") values (gen_random_uuid(),$1,$2,$3,'wild')`, [dexId, id, at]) }
  console.log(JSON.stringify({ region, studied: studied.length, seen: seen.length }))
  await c.end()
  process.exit(0)
}

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m5a-${port}`, 'about:blank'], { stdio: 'ignore' })
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
  while (Date.now() - t0 < ms) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return; await sleep(150) }
  throw new Error(`timeout waiting for ${selector}; page: ${await evaluate('location.href + " | " + document.body.innerText.slice(0, 300)')}`)
}
const waitGone = async (selector, ms = 10_000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (!(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))) return; await sleep(100) }
  throw new Error(`timeout waiting for ${selector} to go`)
}
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
const type = async (selector, text) => {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await sleep(250)
}
const cells = () => evaluate(`document.querySelectorAll('[data-testid=grid] li').length`)
const names = (n = 3) => evaluate(`[...document.querySelectorAll('[data-testid=grid] li')].slice(0, ${n}).map((li) => li.textContent.trim())`)
const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`)
const url = () => evaluate('location.pathname + location.search')

mkdirSync(outDir, { recursive: true })
const suffix = `${locale}-${scheme}${width === 390 ? '' : `-${width}`}`
const shot = async (name) => {
  await evaluate(`document.querySelector('nextjs-portal')?.remove()`)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  const file = join(outDir, `a-${name}-${suffix}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  console.log(file)
}

await send('Network.setCookie', { name: 'dex_id', value: dexId, url: base, httpOnly: true, sameSite: 'Lax' })
await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
// One retry: the dev server answers a 404 or stalls for the first request after a recompile.
const open = async (path) => {
  for (let i = 0; ; i++) {
    await send('Page.navigate', { url: `${base}/${locale}${path}` })
    try { await waitFor('[data-testid=grid] li', 30_000); return } catch (e) { if (i) throw e }
  }
}

if (mode === 'shots') {
  await open('')
  await sleep(3000) // images
  await shot('grid')
  await evaluate('window.scrollTo(0, 1400)')
  await waitFor('[data-testid=fab]')
  await sleep(2500)
  if (process.env.DEBUG) console.log(await evaluate(`JSON.stringify({ y: scrollY, fab: document.querySelector('[data-testid=fab]')?.getBoundingClientRect(), bar: document.querySelector('[data-testid=bar]')?.getBoundingClientRect(), inner: innerHeight })`))
  await shot('scrolled')
  await evaluate('window.scrollTo(0, 0)')
  await sleep(300)
  await click('[data-testid=filter-button]')
  await waitFor('[data-testid=drawer]')
  await sleep(400)
  await shot('drawer')
  if (locale === 'de' && scheme === 'light' && width === 390) { await open('?sort=seen'); await sleep(3000); await shot('grid-states') } // the three cell states, seen first
  ws.close(); proc.kill()
  process.exit(0)
}

// ── checks ───────────────────────────────────────────────────────────────────
const out = {}
await open('')
await sleep(500)
out.c3 = { cells: await cells(), counters: await text('[data-testid=counters]'), badge: await text('[data-testid=badge]'), url: await url() }

// C4: reptiles off, Zeigen = Studiert, sort = Name, chip on. Counters move only with the tiles; the badge says 3.
await click('[data-testid=filter-button]')
await waitFor('[data-testid=drawer]')
await click('[data-testid=now-only]')
await sleep(300)
out.c4 = { nowOnlyAllTiles: await evaluate(`document.querySelector('[data-testid=apply]').textContent`), nowOnlyCells: await cells() }
await click('[data-testid=tile-reptile]')
await sleep(600)
out.c4.countersReptilesOff = await text('[data-testid=counters]')
await click('[data-testid=show-studied]')
await click('[data-testid=sort-name]')
await sleep(300)
out.c4.countersAfterShowSort = await text('[data-testid=counters]')
out.c4.apply = await evaluate(`document.querySelector('[data-testid=apply]').textContent`)
await click('[data-testid=apply]')
await waitGone('[data-testid=drawer]')
out.c4.badge = await text('[data-testid=badge]')
out.c4.url = await url()
out.c4.first = await names(5)
// Back from another page restores the four and the scroll offset: a plain client-side navigation to /you and back.
await evaluate('window.scrollTo(0, 0)')
await click('[data-testid=show-all], [data-testid=filter-button]') // reopen to set Alle so the list is long enough to scroll
await waitFor('[data-testid=drawer]'); await click('[data-testid=show-all]'); await click('[data-testid=apply]'); await waitGone('[data-testid=drawer]')
await sleep(300)
await evaluate('window.scrollTo(0, 900)')
await sleep(600)
const scrollBefore = await evaluate('window.scrollY')
const urlBefore = await url()
await evaluate(`document.querySelector('nav a[href$="/you"]').click()`)
await waitFor('[data-testid=display-name]')
await sleep(500)
await evaluate('history.back()')
await waitFor('[data-testid=grid] li')
await sleep(1200)
out.c4.back = { urlBefore, urlAfter: await url(), scrollBefore, scrollAfter: await evaluate('window.scrollY'), badge: await text('[data-testid=badge]') }
await click('[data-testid=fab], [data-testid=filter-button]')
await waitFor('[data-testid=drawer]')
out.c4.back.drawer = {
  reptile: await evaluate(`document.querySelector('[data-testid=tile-reptile]').getAttribute('aria-checked')`),
  show: await evaluate(`[...document.querySelectorAll('[data-testid^=show-]')].find((b) => b.getAttribute('aria-checked') === 'true')?.dataset.testid`),
  sort: await evaluate(`[...document.querySelectorAll('[data-testid^=sort-]')].find((b) => b.getAttribute('aria-checked') === 'true')?.dataset.testid`),
  nowOnly: await evaluate(`document.querySelector('[data-testid=now-only]').getAttribute('aria-pressed')`),
}
await click('[data-testid=reset]')
await sleep(600)
out.c4.afterReset = { apply: await evaluate(`document.querySelector('[data-testid=apply]').textContent`), url: await url() }
await click('[data-testid=apply]')
await waitGone('[data-testid=drawer]')

// C5: search "amsel", "turdus", "blackbird"; empty result is one line.
await open('')
out.c5 = {}
for (const q of ['amsel', 'turdus', 'blackbird', 'xyzzy']) {
  await type('[data-testid=search]', q)
  out.c5[q] = { cells: await cells(), first: await names(3), empty: await text('[data-testid=empty]'), url: await url() }
}
await type('[data-testid=search]', '')
out.c5.cleared = await cells()

console.log(JSON.stringify(out, null, 1))
ws.close(); proc.kill()
