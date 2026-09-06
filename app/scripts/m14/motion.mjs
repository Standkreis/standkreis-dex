// Handoff 0014b, C1–C5 on the production build, headless Chrome over CDP (as scripts/m14/ui.mjs).
// Frames are taken deterministically: `document.getAnimations()` is paused and seeked (CSS animations and transitions alike),
// so "the frame at 100 ms" is the frame at 100 ms, not "whenever the screenshot landed".
// C1 the chooser rises (0 · 100 · 260 ms) and leaves; C2 a short drag settles back from where it was; C3 the moss dot slides
// atlas → diary → profile with aria-current right at every step; C4 the drawer's chips transition without the drawer moving;
// C5 prefers-reduced-motion: durations 0, the sheet still unmounts. Then every sheet once: rises, closes on Escape.
// usage: node scripts/m14/motion.mjs [outDir] [baseUrl]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir = '.', base = 'http://localhost:3005'] = process.argv.slice(2)
const locale = 'de'
const regionId = process.env.REGION ?? '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const SEEN_KEY = +(process.env.SEEN ?? 5147038) // Idaea bilinearia
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base }
mkdirSync(outDir, { recursive: true })

// ── a fresh identity with the region and one sighting (for the diary's drawer) ────────────────────────────────────
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
out.seed = { seen: seenTaxon?.sciName, sighting: (await trpc('sighting.create', { taxonId: seenTaxon.id, at: new Date().toISOString(), wildness: 'wild' })).status }

// ── Chrome over CDP ────────────────────────────────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m14b-${port}`, 'about:blank'], { stdio: 'ignore' })
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
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(20) }; return null }
const waitGone = async (selector, t = 5_000) => { const s = Date.now(); while (Date.now() - s < t) { if (!(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))) return Date.now() - s; await sleep(10) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const rect = (selector) => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null })()`)
const style = (selector, props) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const c = getComputedStyle(el); return Object.fromEntries(${JSON.stringify(props)}.map((p) => [p, c[p]])) })()`)
const goto = async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return waitFor(sel) }
// The translateY of a computed transform matrix, in px (0 when none).
const ty = (t) => (!t || t === 'none' ? 0 : Math.round(+t.match(/matrix\((.*)\)/)[1].split(',')[5]))
// Pause every running animation and transition at `ms`; `play` lets them run on.
const seek = (ms) => evaluate(`document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ${ms} }); document.getAnimations().length`)
const play = () => evaluate(`document.getAnimations().forEach((a) => a.play()); 0`)
const animations = () => evaluate(`document.getAnimations().map((a) => ({ name: a.animationName ?? a.transitionProperty, duration: a.effect.getTiming().duration, target: a.effect.target.className.split(' ').slice(0, 2).join(' ') }))`)
const media = (features) => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, ...features] })

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await media([])
const PANEL = '[data-testid=chooser] .sheet-panel'

// ── C1 · the chooser rises: frames at 0, 100, 260 ms; then leaves ────────────────────────────────────────────────
await goto('/', '[data-testid=grid]')
await sleep(800)
out.tokens = await evaluate(`(() => { const c = getComputedStyle(document.documentElement); return Object.fromEntries(['--motion-fast', '--motion-base', '--motion-sheet', '--motion-sheet-out', '--ease-out-soft', '--ease-overshoot'].map((k) => [k, c.getPropertyValue(k).trim()])) })()`)
// click, let React flush the discrete event (a microtask), freeze: frame 0 is frame 0
const clickFreeze = (selector, ms) => evaluate(`(async () => { document.querySelector(${JSON.stringify(selector)}).click(); await new Promise((r) => setTimeout(r, 0)); document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ${ms} }); return document.getAnimations().length })()`)
await clickFreeze('nav button[aria-label]', 0)
const panelH = (await rect(PANEL))?.h
out.c1 = { panelHeight: panelH, animations: await animations(), frames: {} }
for (const ms of [0, 100, 260]) {
  await seek(ms)
  out.c1.frames[ms] = { translateY: ty((await style(PANEL, ['transform']))?.transform), scrimOpacity: +(await style('[data-testid=chooser] .sheet-scrim', ['opacity']))?.opacity, top: (await rect(PANEL))?.y }
  await shot(`c1-open-${ms}ms`)
}
await play(); await sleep(400)
out.c1.settled = { translateY: ty((await style(PANEL, ['transform']))?.transform), top: (await rect(PANEL))?.y, style: await style(PANEL, ['transitionDuration', 'transitionTimingFunction', 'animationDuration']) }
// close by the scrim: freeze at 100 ms of the leave, then let it finish and time the unmount
await clickFreeze('[data-testid=chooser]', 100)
out.c1.leave = { state: await evaluate(`document.querySelector('[data-testid=chooser]')?.dataset.state`), at100: { translateY: ty((await style(PANEL, ['transform']))?.transform), scrimOpacity: +(await style('[data-testid=chooser] .sheet-scrim', ['opacity']))?.opacity }, animations: await animations() }
await shot('c1-close-100ms')
const t0 = Date.now(); await play()
out.c1.leave.goneAfterMs = await waitGone('[data-testid=chooser]', 2000); out.c1.leave.goneAfterMsWall = Date.now() - t0

// ── C2 · a short drag, released below the threshold: settles back from where it was ──────────────────────────────
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: 1, ...extra })
const openChooser = async () => { await click('nav button[aria-label]'); await waitFor('[data-testid=chooser]'); await sleep(400) }
await openChooser()
{
  const h = (await rect('[data-testid=chooser-handle]'))
  const x = h.x + h.w / 2, y0 = h.y + h.h / 2
  const travel = Math.round(panelH * 0.25) // below DRAG_CLOSE_FRACTION (0.3), slow enough not to flick
  await mouse('mousePressed', x, y0, { clickCount: 1 })
  for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', x, y0 + Math.round((i / 8) * travel)); await sleep(40) }
  await sleep(150)
  const held = { translateY: ty((await style(PANEL, ['transform']))?.transform), transition: (await style(PANEL, ['transitionProperty']))?.transitionProperty }
  await shot('c2-held')
  // release and freeze 80 ms into the settle: the panel must be between the held offset and 0, never at the bottom
  await mouse('mouseReleased', x, y0 + travel, { clickCount: 1 })
  await seek(80)
  const at80 = { translateY: ty((await style(PANEL, ['transform']))?.transform), animations: await animations() }
  await shot('c2-release-80ms')
  await play()
  const samples = []
  for (let i = 0; i < 12; i++) { samples.push(ty((await style(PANEL, ['transform']))?.transform)); await sleep(25) }
  out.c2 = { travel, held, at80, samplesAfterRelease: samples, stillOpen: await evaluate(`!!document.querySelector('[data-testid=chooser]')`), monotone: samples.every((v, i) => i === 0 || v <= samples[i - 1]), neverBelowHeld: samples.every((v) => v <= travel + 1) && at80.translateY <= travel && at80.translateY > 0 }
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
  out.c2.escapeCloses = await waitGone('[data-testid=chooser]', 2000)
}

// ── C3 · atlas → diary → profile: the dot slides, the filled glyph fades in, aria-current at every step ───────────
const tabState = () => evaluate(`(() => { const dot = document.querySelector('[data-testid=tab-dot]'); return { current: [...document.querySelectorAll('nav a')].filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.dataset.testid), dotX: Math.round(dot.getBoundingClientRect().left), dotOpacity: getComputedStyle(dot).opacity, fills: [...document.querySelectorAll('nav a')].map((a) => a.dataset.testid.slice(4) + ':' + (+getComputedStyle(a.querySelector('.tab-fill')).opacity).toFixed(2)) } })()`)
const slotX = (tab) => evaluate(`Math.round(document.querySelector('[data-testid=tab-${tab}] [data-dot-slot]').getBoundingClientRect().left)`)
await goto('/', '[data-testid=grid]'); await sleep(500)
out.c3 = { steps: [{ at: 'atlas', ...(await tabState()), slot: await slotX('dex') }], dotStyle: await style('[data-testid=tab-dot]', ['transitionDuration', 'transitionProperty']) }
for (const [tab, sel] of [['journal', '[data-testid=pills], [data-testid=empty]'], ['you', '[data-testid=counters]']]) {
  await click(`[data-testid=tab-${tab}]`)
  // the moment aria-current flips is the moment the transitions start: freeze 110 ms in
  const s = Date.now(); let flipped = false
  while (Date.now() - s < 10_000 && !flipped) flipped = await evaluate(`(() => { const ok = document.querySelector('[data-testid=tab-${tab}]')?.getAttribute('aria-current') === 'page'; if (ok) document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 110 }); return ok })()`)
  out.c3.steps.push({ at: `${tab} flipped after ms`, ms: Date.now() - s })
  const mid = { at: `→ ${tab} @110ms`, ...(await tabState()), animations: (await animations()).filter((a) => a.target.includes('tab')) }
  await shot(`c3-to-${tab}-110ms`)
  await play(); await waitFor(sel); await sleep(400)
  out.c3.steps.push(mid, { at: tab, ...(await tabState()), slot: await slotX(tab) })
}
await shot('c3-you')

// ── C4 · the drawer: two chips toggle with a transition; the dialog does not move ────────────────────────────────
await goto('/', '[data-testid=grid]'); await sleep(500)
await click('[data-testid=filter-button]'); await waitFor('[data-testid=drawer]'); await sleep(500)
const DIALOG = '[data-testid=drawer] .sheet-panel'
const chipBg = (id) => evaluate(`getComputedStyle(document.querySelector('[data-testid=${id}]')).backgroundColor`)
out.c4 = { dialogBefore: await rect(DIALOG), chipStyle: await style('[data-testid=tile-reptile]', ['transitionDuration', 'transitionProperty']), reptile: { before: await chipBg('tile-reptile') } }
await clickFreeze('[data-testid=tile-reptile]', 75)
out.c4.reptile.at75 = await chipBg('tile-reptile'); out.c4.reptile.animations = (await animations()).filter((a) => a.name !== 'none')
await shot('c4-chip-75ms')
await play(); await sleep(300)
out.c4.reptile.after = await chipBg('tile-reptile')
out.c4.studied = { before: await chipBg('show-studied') }
await click('[data-testid=show-studied]'); await sleep(40); out.c4.studied.at40 = await chipBg('show-studied'); await sleep(300); out.c4.studied.after = await chipBg('show-studied')
out.c4.dialogAfter = await rect(DIALOG)
out.c4.dialogMoved = JSON.stringify(out.c4.dialogBefore) !== JSON.stringify(out.c4.dialogAfter)
await shot('c4-drawer')
await click('[data-testid=apply]'); out.c4.applyCloses = await waitGone('[data-testid=drawer]', 2000)

// ── C5 · prefers-reduced-motion: instant states, the sheet still closes ──────────────────────────────────────────
await media([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await goto('/', '[data-testid=grid]'); await sleep(500)
await click('nav button[aria-label]')
const openedMs = await waitFor('[data-testid=chooser]')
out.c5 = { openedMs, panel: await style(PANEL, ['animationDuration', 'transitionDuration', 'transform']), scrim: await style('[data-testid=chooser] .sheet-scrim', ['animationDuration', 'opacity']), runningAnimations: await evaluate(`document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getTiming().duration > 0).length`) }
await shot('c5-reduced-open')
await click('[data-testid=chooser]')
out.c5.closedAfterMs = await waitGone('[data-testid=chooser]', 2000)
await click('[data-testid=tab-journal]'); await waitFor('[data-testid=tab-journal][aria-current=page]'); await sleep(50)
out.c5.dot = await style('[data-testid=tab-dot]', ['transitionDuration'])
out.c5.tabs = await tabState()
await goto('/', '[data-testid=grid]'); await sleep(300)
await click('[data-testid=filter-button]'); await waitFor('[data-testid=drawer]')
out.c5.chip = await style('[data-testid=tile-reptile]', ['transitionDuration'])
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
out.c5.drawerEscapeMs = await waitGone('[data-testid=drawer]', 2000)
await media([])

// ── every sheet once: rises through .sheet-panel, closes on Escape in about --motion-sheet-out ───────────────────
const sheets = []
const once = async (label, open, sel) => {
  await open()
  const opened = await waitFor(sel, 15_000)
  if (opened === null) { sheets.push({ label, opened: null }); return }
  await sleep(50)
  const anim = (await animations()).find((a) => a.name === 'sheet-in')
  await sleep(400)
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
  const state = await evaluate(`document.querySelector(${JSON.stringify(sel)})?.dataset.state`)
  sheets.push({ label, opened, sheetIn: anim?.duration ?? null, closingState: state, goneMs: await waitGone(sel, 2000) })
}
await goto('/', '[data-testid=grid]'); await sleep(400)
await once('LogSheet', () => click('nav button[aria-label]'), '[data-testid=chooser]')
await once('FilterDrawer', () => click('[data-testid=filter-button]'), '[data-testid=drawer]')
await goto('/journal', '[data-testid=row]'); await sleep(400)
await once('SightingDrawer', () => click('[data-testid=row] a'), '[data-testid=sighting-drawer]')
await once('SourceSheet (hero ⓘ in the drawer)', async () => { await click('[data-testid=row] a'); await waitFor('[data-testid=hero-info]'); await click('[data-testid=hero-info]') }, '[data-testid=source-sheet]')
// Escape took only the top sheet: the drawer under it is still open, a second Escape closes it
out.escapeStack = { drawerStillOpen: await evaluate(`!!document.querySelector('[data-testid=sighting-drawer]')`) }
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
out.escapeStack.drawerGoneMs = await waitGone('[data-testid=sighting-drawer]', 2000)
await goto('/settings', '[data-testid=delete]'); await sleep(400)
await once('IdentityDeleteSheet', () => click('[data-testid=delete]'), '.sheet')
await shot('sheets-settings-after')
out.sheets = sheets
out.nudge = 'PasskeyNudge needs the first wild sighting with a fill: same primitive, not driven here (C7, the owner)'

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
