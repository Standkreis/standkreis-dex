// Handoff 0014 Track A, C1–C5 on the production build, headless Chrome over CDP (as scripts/m13/onboarding.mjs).
// A fresh identity in Mainz-Bingen with one seen and one studied species (via tRPC), then: the grid rings and the bar (C2, G3),
// the filter drawer's chips (C3), drag / flick / wobble on the chooser and the drawer (C1), a species page without
// lookalikes (C4, D1, D2, D5), atlas → species → lookalike → back (C5, P4), the profile line (P1), the onboarding demo (G4, G5).
// usage: node scripts/m14/ui.mjs [outDir] [baseUrl]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const locale = 'de'
const regionId = process.env.REGION ?? '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const SEEN_KEY = +(process.env.SEEN ?? 5147038) // Idaea bilinearia: 8 lookalikes
const STUDIED_KEY = +(process.env.STUDIED ?? 1340542) // Bombus hortorum
const BARE_KEY = +(process.env.BARE ?? 7434815) // Planuncus tingitanus: no lookalikes, no interactions
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base }
mkdirSync(outDir, { recursive: true })

// ── a fresh identity with the region, one sighting, one study ─────────────────────────────────────────────────────
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
const seenTaxon = (await trpc('taxon.page', { gbifKey: SEEN_KEY, regionId }, 'GET')).data
const studiedTaxon = (await trpc('taxon.page', { gbifKey: STUDIED_KEY, regionId }, 'GET')).data
out.seed = {
  seen: seenTaxon?.sciName, studied: studiedTaxon?.sciName,
  sighting: (await trpc('sighting.create', { taxonId: seenTaxon.id, at: new Date().toISOString(), wildness: 'wild' })).status,
  study: (await trpc('study.mark', { taxonId: studiedTaxon.id })).status,
}

// ── Chrome over CDP ────────────────────────────────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m14-${port}`, 'about:blank'], { stdio: 'ignore' })
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
const waitGone = async (selector, t = 5_000) => { const s = Date.now(); while (Date.now() - s < t) { if (!(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))) return Date.now() - s; await sleep(50) }; return null }
const waitPath = async (re, t = 15_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`${re}.test(location.pathname + location.search)`)) return Date.now() - s; await sleep(50) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const rect = (selector) => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null })()`)
const style = (selector, props) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const c = getComputedStyle(el); return Object.fromEntries(${JSON.stringify(props)}.map((p) => [p, c[p]])) })()`)
const goto = async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return waitFor(sel) }
const MOSS = 'rgb(22, 163, 74)', SKY = 'rgb(37, 99, 235)', AMBER = 'rgb(196, 98, 15)'
const MOSSES = ['rgb(22, 163, 74)', 'rgb(21, 128, 61)', 'rgb(220, 245, 227)', 'rgb(34, 197, 94)', 'rgb(74, 222, 128)', 'rgb(23, 64, 42)'] // moss, moss-deep, moss-soft in both themes

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
const light = () => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
await light() // the walk is in sunlight; the dark shot is taken on purpose below

// ── C2 · the grid: seen cell with the moss ring, studied cell with the amber ring; G3 · the bar ────────────────────
await goto('/?q=Idaea', '[data-testid=grid]')
await sleep(1500)
const cellRing = (taxonId) => style(`[data-taxon="${taxonId}"] > a > div`, ['boxShadow'])
out.c2 = { seenRing: (await cellRing(seenTaxon.id))?.boxShadow, counters: await evaluate(`document.querySelector('[data-testid=counters]')?.innerText`) }
await shot('c2-grid-seen')
await goto('/?q=Bombus', '[data-testid=grid]')
await sleep(1500)
out.c2.studiedRing = (await cellRing(studiedTaxon.id))?.boxShadow
await shot('c2-grid-studied')
out.g3 = {
  tabs: await evaluate(`[...document.querySelectorAll('nav a')].map((a) => ({ label: a.getAttribute('aria-label'), text: a.innerText, current: a.getAttribute('aria-current'), filled: !!a.querySelector('svg path[fill="currentColor"]'), dot: getComputedStyle(a.lastElementChild).backgroundColor, color: getComputedStyle(a).color }))`),
  barHeight: (await rect('nav > div'))?.h,
}
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
await sleep(200)
out.c2.darkAmber = (await style('[data-testid=counters] span', ['color']))?.color
await shot('c2-grid-studied-dark')
await light()

// ── C3 · the drawer: two tiles off, "studiert" on; the apply button the only moss ───────────────────────────────
await goto('/', '[data-testid=grid]')
await click('[data-testid=filter-button]')
await waitFor('[data-testid=drawer]')
await click('[data-testid=tile-reptile]'); await click('[data-testid=tile-amphibian]'); await click('[data-testid=show-studied]')
await sleep(300)
out.c3 = {
  chips: await evaluate(`[...document.querySelectorAll('[data-testid=drawer] [role=checkbox], [data-testid=drawer] [role=radio]')].filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => ({ id: b.dataset.testid, bg: getComputedStyle(b).backgroundColor, color: getComputedStyle(b).color, ring: getComputedStyle(b).boxShadow }))`),
  mossOnSheet: await evaluate(`[...document.querySelectorAll('[data-testid=drawer] [role=dialog] *')].filter((el) => { const c = getComputedStyle(el); return [c.backgroundColor, c.color, c.boxShadow].some((v) => ${JSON.stringify(MOSSES)}.some((m) => v.includes(m))) }).map((el) => el.dataset.testid ?? el.tagName + ':' + el.innerText.slice(0, 20))`),
  results: await evaluate(`document.querySelector('[data-testid=apply]')?.innerText`),
}
await shot('c3-drawer')

// ── C1 · drag on the drawer, then on the chooser ──────────────────────────────────────────────────────────────────
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: 1, ...extra })
const drag = async (handle, dialog, plan) => {
  const r = await rect(handle)
  const x = r.x + r.w / 2, y0 = r.y + r.h / 2
  await mouse('mousePressed', x, y0, { clickCount: 1 })
  let y = y0
  let mid = null
  for (const { dy, ms } of plan) { y = y0 + dy; await mouse('mouseMoved', x, y); await sleep(ms); mid = (await style(dialog, ['transform']))?.transform }
  await mouse('mouseReleased', x, y, { clickCount: 1 })
  const closedMs = await waitGone(dialog, 1500)
  if (closedMs === null) await sleep(250)
  return { travel: y - y0, transformBeforeRelease: mid, closed: closedMs !== null, transformAfter: closedMs === null ? (await style(dialog, ['transform']))?.transform : null }
}
const drawerH = (await rect('[data-testid=drawer] [role=dialog]'))?.h
out.c1 = { drawer: { height: drawerH } }
out.c1.drawer.wobble = await drag('[data-testid=drawer-handle]', '[data-testid=drawer] [role=dialog]', [{ dy: 8, ms: 60 }, { dy: 16, ms: 60 }, { dy: 20, ms: 200 }])
out.c1.drawer.slowPast = await drag('[data-testid=drawer-handle]', '[data-testid=drawer] [role=dialog]', Array.from({ length: 10 }, (_, i) => ({ dy: Math.round(((i + 1) / 10) * drawerH * 0.4), ms: 60 })))
await click('[data-testid=filter-button]'); await waitFor('[data-testid=drawer]'); await sleep(200)
out.c1.drawer.flick = await drag('[data-testid=drawer-handle]', '[data-testid=drawer] [role=dialog]', [{ dy: 15, ms: 16 }, { dy: 30, ms: 16 }, { dy: 45, ms: 16 }])
const openChooser = async () => { await click('nav button[aria-label]'); await waitFor('[data-testid=chooser]'); await sleep(200) }
await openChooser()
const chooserH = (await rect('[data-testid=chooser] [role=dialog]'))?.h
out.c1.chooser = { height: chooserH }
await mouse('mousePressed', 195, (await rect('[data-testid=chooser-handle]')).y + 10, { clickCount: 1 }); await mouse('mouseMoved', 195, (await rect('[data-testid=chooser-handle]')).y + 90); await sleep(50)
await shot('c1-chooser-mid-drag')
await mouse('mouseReleased', 195, (await rect('[data-testid=chooser-handle]')).y + 90, { clickCount: 1 })
await waitGone('[data-testid=chooser]', 1500)
await openChooser()
out.c1.chooser.wobble = await drag('[data-testid=chooser-handle]', '[data-testid=chooser] [role=dialog]', [{ dy: 10, ms: 60 }, { dy: 18, ms: 60 }, { dy: 22, ms: 200 }])
out.c1.chooser.slowPast = await drag('[data-testid=chooser-handle]', '[data-testid=chooser] [role=dialog]', Array.from({ length: 10 }, (_, i) => ({ dy: Math.round(((i + 1) / 10) * chooserH * 0.4), ms: 60 })))
await openChooser()
out.c1.chooser.flick = await drag('[data-testid=chooser-handle]', '[data-testid=chooser] [role=dialog]', [{ dy: 15, ms: 16 }, { dy: 30, ms: 16 }, { dy: 45, ms: 16 }])

// ── C4 · a species without lookalikes and interactions; D1 D2 on the same page ─────────────────────────────────
await goto(`/species/${BARE_KEY}`, '[data-testid=occurrence]')
await sleep(800)
out.c4 = {
  lookalikes: await evaluate(`!!document.querySelector('[data-testid=lookalikes]')`),
  ecology: await evaluate(`!!document.querySelector('[data-testid=ecology]')`),
  occurrence: await evaluate(`document.querySelector('[data-testid=occurrence]')?.innerText.split('\\n').slice(0, 3).join(' | ')`),
  stateOrder: await evaluate(`[...document.querySelectorAll('[data-testid=state] > span')].map((s) => s.dataset.testid)`),
  buttons: await evaluate(`[...document.querySelectorAll('[data-testid=log], [data-testid=study]')].map((b) => ({ text: b.innerText, svg: !!b.querySelector('svg') }))`),
  emoji: await evaluate(`(document.querySelector('[data-testid=species]')?.innerText.match(/\\p{Extended_Pictographic}/gu) ?? []).filter((c) => c !== '©')`),
}
await evaluate(`window.scrollTo(0, document.body.scrollHeight)`); await sleep(300)
await shot('c4-bare-species-bottom')
await goto(`/species/${SEEN_KEY}`, '[data-testid=state]')
await sleep(800)
out.c4.seenPage = { stateOrder: await evaluate(`[...document.querySelectorAll('[data-testid=state] > span')].map((s) => s.dataset.testid + ':' + s.innerText)`), emoji: await evaluate(`(document.querySelector('[data-testid=species]')?.innerText.match(/\\p{Extended_Pictographic}/gu) ?? []).filter((c) => c !== '©')`) }
await shot('d1-species-seen')

// ── C5 · atlas → species → lookalike → back: the atlas, scroll kept; then the diary chain ────────────────────────
await goto('/', '[data-taxon]')
await sleep(1200)
await evaluate(`document.querySelector('[data-taxon="${seenTaxon.id}"]')?.scrollIntoView({ block: 'center' })`)
await sleep(300)
const scrollBefore = await evaluate('window.scrollY')
await click(`[data-taxon="${seenTaxon.id}"] a`)
await waitPath(`/\\/species\\/${SEEN_KEY}$/`)
await waitFor('[data-testid=lookalikes] a')
const origin = await evaluate(`sessionStorage.getItem('dex.speciesOrigin')`)
await click('[data-testid=lookalikes] a')
await waitPath(`/\\/species\\/(?!${SEEN_KEY}$)\\d+$/`)
const hop = await evaluate('location.pathname')
await sleep(500)
await click('button[aria-label=Zurück]')
const backMs = await waitPath('/\\/de\\/?$/')
await waitFor('[data-testid=grid]')
await sleep(600)
out.c5 = { atlas: { origin, hop, backMs, landed: await evaluate('location.pathname + location.search'), scrollBefore, scrollAfter: await evaluate('window.scrollY'), originCleared: await evaluate(`sessionStorage.getItem('dex.speciesOrigin')`) === null } }
await shot('c5-atlas-after-back')
await goto('/journal', '[data-testid=row]')
await sleep(500)
out.c5.pills = await evaluate(`[...document.querySelectorAll('[data-testid=pills] button')].map((b) => ({ id: b.dataset.testid, selected: b.getAttribute('aria-selected'), bg: getComputedStyle(b).backgroundColor }))`)
out.c5.journalThumbRing = await evaluate(`[...document.querySelectorAll('[data-testid=row] a > span[aria-hidden]')].map((s) => getComputedStyle(s).boxShadow)`)
await shot('c2-journal')
await click(`[data-testid=row][data-kind=study] a`)
await waitPath(`/\\/species\\/${STUDIED_KEY}$/`)
await waitFor('[data-testid=lookalikes] a')
await click('[data-testid=lookalikes] a')
await waitPath(`/\\/species\\/(?!${STUDIED_KEY}$)\\d+$/`)
await sleep(400)
await click('button[aria-label=Zurück]')
out.c5.diary = { backMs: await waitPath('/\\/journal/'), landed: await evaluate('location.pathname') }

// ── P1 · the profile line ─────────────────────────────────────────────────────────────────────────────────────────
await goto('/you', '[data-testid=counters]')
await sleep(400)
out.p1 = await style('[data-testid=counters]', ['fontSize', 'color'])
await shot('p1-profile')

// ── G4 G5 · the onboarding demo cells and the selection colours ───────────────────────────────────────────────────
await goto('/onboarding?change=1', '[data-testid=regions] button')
await sleep(600)
out.g5 = { radioDot: await evaluate(`(() => { const b = document.querySelector('[data-testid=regions] button[aria-checked=true]'); const dot = b?.querySelector('span > span'); return dot && getComputedStyle(dot).backgroundColor })()`) }
await shot('g5-onboarding-1-region')
await evaluate(`document.querySelector('[data-testid=region-next]').click()`)
await waitFor('[data-testid=tiles] button'); await sleep(1500)
out.g5.checkBadge = await evaluate(`(() => { const b = document.querySelector('[data-testid=tiles] button[aria-checked=true] span > span + span'); return b && getComputedStyle(b).backgroundColor })()`)
await shot('g5-onboarding-2-tiles')
await click('[data-testid=tiles-next]')
await waitFor('[data-testid=preview]'); await waitFor('[data-testid=number]', 20_000); await sleep(1500)
out.g4 = {
  demoOrder: await evaluate(`[...document.querySelectorAll('[data-testid^=demo-]')].map((d) => d.dataset.testid)`),
  seenRing: (await style('[data-testid=demo-seen] > div > div:last-child', ['boxShadow']))?.boxShadow,
  studiedRing: (await style('[data-testid=demo-studied] > div > div:last-child', ['boxShadow']))?.boxShadow,
}
await shot('g4-onboarding-3-ready')

out.tokens = { MOSS, SKY, AMBER }
console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
