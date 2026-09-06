// Handoff 0014 Track D, C9 on the production build, headless Chrome over CDP (as scripts/m14/ui.mjs).
// One palette per run: the same seven shots (six screens in light, the grid again in dark) at 390 × 844, named
// <prefix>-<screen>-de.png, plus the computed colours of the cells' rings, the species buttons, the counters and the
// group bars, so the two runs (today's tokens, the proposal in tokens.css) can be laid side by side in the findings.
// A fresh identity in Mainz-Bingen; the seen and the studied species are the first two cells of the unfiltered atlas,
// so both rings sit in one grid shot.
// usage: node scripts/m14/track-d.mjs <prefix> [outDir] [baseUrl]     e.g. d-today ../docs/handoffs/0014-shots http://localhost:3004
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [prefix = 'd-today', outDir = '.', base = 'http://localhost:3004'] = process.argv.slice(2)
const locale = 'de'
const regionId = process.env.REGION ?? '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { prefix, base }
mkdirSync(outDir, { recursive: true })

// ── a fresh identity with the region ──────────────────────────────────────────────────────────────────────────────
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

// ── Chrome over CDP ────────────────────────────────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m14d-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id) } }
const raw = (method, params = {}, sessionId) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })) })
const { targetInfos } = await raw('Target.getTargets')
const page = targetInfos.find((t) => t.type === 'page')
const { sessionId } = await raw('Target.attachToTarget', { targetId: page.targetId, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable')
const [name, value] = cookie.split('=')
await send('Network.setCookie', { name, value, url: base })
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(50) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${prefix}-${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const style = (selector, props) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const c = getComputedStyle(el); return Object.fromEntries(${JSON.stringify(props)}.map((p) => [p, c[p]])) })()`)
const goto = async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return waitFor(sel) }
const scheme = (v) => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v }] })
const token = (n) => evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--color-${n}').trim()`)
const tokens = async () => Object.fromEntries(await Promise.all(['moss', 'moss-deep', 'moss-soft', 'amber', 'amber-soft', 'sky'].map(async (n) => [n, await token(n)])))

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await scheme('light')

// ── the first two cells of the atlas become the seen and the studied species ─────────────────────────────────────
await goto('/', '[data-taxon]')
await sleep(1200)
const cells = await evaluate(`[...document.querySelectorAll('[data-taxon]')].slice(0, 2).map((c) => ({ taxonId: c.dataset.taxon, href: c.querySelector('a')?.getAttribute('href') }))`)
const [seen, studied] = cells
const seenKey = seen.href.split('/').pop()
out.seed = {
  seen: seen.href, studied: studied.href,
  sighting: (await trpc('sighting.create', { taxonId: seen.taxonId, at: new Date().toISOString(), wildness: 'wild' })).status,
  study: (await trpc('study.mark', { taxonId: studied.taxonId })).status,
}
// the first visit persisted identity.progress (0 / 0) to localStorage (trpc/client.tsx): drop the origin's storage, keep the cookie
await send('Storage.clearDataForOrigin', { origin: base, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' })
await send('Network.setCookie', { name, value, url: base })

// ── 1 · grid, light and dark ──────────────────────────────────────────────────────────────────────────────────────
await goto('/', '[data-taxon]')
await sleep(1500)
const ring = (selector) => style(`${selector} .ring-inset`, ['boxShadow']).then((s) => s?.boxShadow ?? null) // the inset ring span (AtlasGrid.tsx:262, SpeciesCard.tsx:31, Onboarding.tsx:341)
const cellRing = (taxonId) => ring(`[data-taxon="${taxonId}"]`)
out.light = { tokens: await tokens(), seenRing: await cellRing(seen.taxonId), studiedRing: await cellRing(studied.taxonId), counters: await evaluate(`document.querySelector('[data-testid=counters]')?.innerText`) }
await shot('grid')
await scheme('dark'); await sleep(300)
out.dark = { tokens: await tokens(), seenRing: await cellRing(seen.taxonId), studiedRing: await cellRing(studied.taxonId) }
await shot('grid-dark')
await scheme('light'); await sleep(200)

// ── 2 · species page top: state row and the two buttons ──────────────────────────────────────────────────────────
await goto(`/species/${seenKey}`, '[data-testid=state]')
await sleep(1000)
out.light.species = {
  state: await evaluate(`[...document.querySelectorAll('[data-testid=state] > span')].map((s) => ({ id: s.dataset.testid, text: s.innerText, color: getComputedStyle(s).color, bg: getComputedStyle(s).backgroundColor }))`),
  buttons: await evaluate(`[...document.querySelectorAll('[data-testid=log], [data-testid=study]')].map((b) => ({ id: b.dataset.testid, text: b.innerText, bg: getComputedStyle(b).backgroundColor, color: getComputedStyle(b).color }))`),
}
await shot('species')

// ── 3 · the filter drawer with selections (as C3: two tiles off, studiert on) ────────────────────────────────────
await goto('/', '[data-testid=grid]')
await click('[data-testid=filter-button]')
await waitFor('[data-testid=drawer]')
await click('[data-testid=tile-reptile]'); await click('[data-testid=tile-amphibian]'); await click('[data-testid=show-studied]')
await sleep(400)
out.light.drawer = { apply: await style('[data-testid=apply]', ['backgroundColor', 'color']), results: await evaluate(`document.querySelector('[data-testid=apply]')?.innerText`) }
await shot('drawer')

// ── 4 · diary ─────────────────────────────────────────────────────────────────────────────────────────────────────
await goto('/journal', '[data-testid=row]')
await sleep(600)
out.light.diaryThumbRings = await evaluate(`[...document.querySelectorAll('[data-testid=row]')].map((r) => r.dataset.kind + ': ' + (r.querySelector('.ring-inset') ? getComputedStyle(r.querySelector('.ring-inset')).boxShadow : null))`)
await shot('diary')

// ── 5 · profile: counters and the group bars ──────────────────────────────────────────────────────────────────────
await goto('/you', '[data-testid=groups]')
await sleep(600)
out.light.profile = {
  counters: await evaluate(`[...document.querySelectorAll('[data-testid=counters] span')].map((s) => ({ text: s.innerText, color: getComputedStyle(s).color }))`),
  bars: await evaluate(`[...document.querySelectorAll('[data-testid=group-insect] span')].map((s) => getComputedStyle(s).backgroundColor)`),
}
await shot('profile')

// ── 6 · onboarding step 3: the demo cards ─────────────────────────────────────────────────────────────────────────
await goto('/onboarding?change=1', '[data-testid=regions] button')
await sleep(600)
await evaluate(`document.querySelector('[data-testid=region-next]').click()`)
await waitFor('[data-testid=tiles] button'); await sleep(1200)
await click('[data-testid=tiles-next]')
await waitFor('[data-testid=preview]'); await waitFor('[data-testid=number]', 20_000); await sleep(1500)
out.light.demo = {
  seenRing: await ring('[data-testid=demo-seen]'),
  studiedRing: await ring('[data-testid=demo-studied]'),
}
await shot('onboarding-3')

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
