// Handoff 0013 C1–C6: the four onboarding steps over the splash on the production build, headless Chrome over CDP
// (as scripts/m12/onboarding.mjs). Walks a fresh identity through region → tiles → ready → promises → atlas, then
// the change path (three steps), then location denied and a point outside every region. Shots per locale and width.
// usage: node scripts/m13/onboarding.mjs [de|en] [outDir] [baseUrl] [width] [height]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [locale = 'de', outDir = '.', base = 'http://localhost:3002', W = '390', H = '844'] = process.argv.slice(2)
const width = +W, height = +H
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(outDir, { recursive: true })
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m13-${port}`, 'about:blank'], { stdio: 'ignore' })
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
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(50) }; return null }
const waitText = async (re, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`${re}.test(document.body.innerText)`)) return Date.now() - s; await sleep(50) }; return null }
const clickRegion = () => evaluate(`(() => { const b = [...document.querySelectorAll('[data-testid=regions] button')].find((b) => /Mainz/.test(b.textContent)) ?? document.querySelector('[data-testid=regions] button'); b?.click(); return b?.textContent ?? null })()`)
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const shot = async (name) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${name}-${locale}-${width}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const rect = (selector) => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null })()`)
const step = () => evaluate(`document.querySelector('[data-testid^=onboarding-]')?.dataset.testid ?? null`)
const text = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`)

const out = { locale, width, height, base }
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setTouchEmulationEnabled', { enabled: true })

// ── C1 C2 C4 C5 C6: the fresh path ─────────────────────────────────────────────
await send('Page.navigate', { url: `${base}/${locale}/onboarding` })
await waitFor('[data-testid=regions] button', 20_000)
await sleep(800) // the image
out.step1 = {
  step: await step(),
  regions: await evaluate(`[...document.querySelectorAll('[data-testid=regions] button')].map((b) => b.innerText.replace(/\\n/g, ' · '))`),
  locate: await text('[data-testid=locate]'),
  searchField: await evaluate(`!!document.querySelector('[data-testid=place]')`),
  typePlaceButton: await evaluate(`[...document.querySelectorAll('button')].some((b) => /Ort eingeben|Type a place/.test(b.textContent))`),
  hint: await evaluate(`/Dein Handy fragt|Your phone will ask/.test(document.body.innerText)`),
  credit: await evaluate(`/Foto:|Photo:/.test(document.body.innerText)`),
  emoji: await evaluate(`document.body.innerText.includes('📍')`),
  splash: await rect('[data-testid=splash]'),
  themeColor: await evaluate(`document.querySelector('meta[name=theme-color]')?.content`),
  bodyBg: await evaluate(`getComputedStyle(document.body).backgroundColor`),
  htmlBg: await evaluate(`getComputedStyle(document.documentElement).backgroundColor`),
  // C6: first paint against the splash's arrival
  paint: await evaluate(`(() => { const fcp = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint')?.startTime; const img = performance.getEntriesByType('resource').find((r) => /splash/.test(r.name)); return { fcpMs: fcp && +fcp.toFixed(0), splash: img && { name: img.name.split('/').pop(), startMs: +img.startTime.toFixed(0), endMs: +img.responseEnd.toFixed(0), bytes: img.encodedBodySize }, currentSrc: document.querySelector('[data-testid=splash]')?.currentSrc?.split('/').pop() } })()`),
}
await shot(process.env.SHOT1 ?? 'c1-1-region')
if (process.env.SHOT1) { console.log(JSON.stringify(out, null, 2)); ws.close(); proc.kill(); process.exit(0) }
out.step1.clicked = await clickRegion()
await waitFor('[data-testid=tiles] button')
await waitText('/\\d+ (Arten|species)/', 20_000)
await sleep(1500) // thumbs
out.step2 = { step: await step(), counter: await text('[data-testid^=onboarding-] > div > div > div'), h1: await rect('h1'), splash: await rect('[data-testid=splash]'),
  tiles: await evaluate(`[...document.querySelectorAll('[data-testid=tiles] button')].map((b) => ({ tile: b.dataset.tile, on: b.getAttribute('aria-checked'), text: b.innerText.replace(/\\n/g, ' · '), thumb: !!b.querySelector('img'), thumbLoaded: b.querySelector('img')?.complete && b.querySelector('img')?.naturalWidth > 0 }))`) }
await shot('c1-2-tiles')
// One off, for the on/off state in the shot
await click('[data-testid=tiles] button[data-tile=reptile]')
await sleep(150)
await shot('c1-2-tiles-one-off')
// Theme-stable: the same screen with the system in light mode
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
await sleep(150)
out.step2.lightBodyBg = await evaluate(`getComputedStyle(document.body).backgroundColor`)
await shot('c1-2-tiles-one-off-light')
await send('Emulation.setEmulatedMedia', { features: [] })
await click('[data-testid=tiles] button[data-tile=reptile]')
await click('[data-testid=tiles-next]')
await waitFor('[data-testid=preview]')
await waitFor('[data-testid=number]', 20_000)
await sleep(1500)
out.step3 = { step: await step(), counter: await text('[data-testid^=onboarding-] > div > div > div'), h1: await rect('h1'), splash: await rect('[data-testid=splash]'),
  numbers: await evaluate(`[...document.querySelectorAll('[data-testid=number]')].map((b) => b.innerText)`), body: await text('h1 + p'),
  noAccount: await evaluate(`/Kein Konto nötig|No account needed/.test(document.body.innerText)`), button: await text('[data-testid=ready-next]') }
await shot('c1-3-ready')
await click('[data-testid=ready-next]')
await waitFor('[data-testid=promises]')
await sleep(300)
out.step4 = { step: await step(), counter: await text('[data-testid^=onboarding-] > div > div > div'), h1: await rect('h1'), splash: await rect('[data-testid=splash]'), title: await text('h1'), promises: await text('[data-testid=promises]'), button: await text('[data-testid=go]') }
await shot('c1-4-promises')
await click('[data-testid=go]')
const atlasMs = await waitFor('[data-testid=bar]', 30_000)
await sleep(500)
out.atlas = { ms: atlasMs, url: await evaluate('location.pathname'), bodyBg: await evaluate(`getComputedStyle(document.body).backgroundColor`), onboardingGone: !(await step()) }
await shot('c5-atlas')

// ── C5: the change path, three steps ───────────────────────────────────────────
await send('Page.navigate', { url: `${base}/${locale}/onboarding?change=1` })
await waitFor('[data-testid=regions] button', 20_000)
await sleep(300)
out.change = { cancel: !!(await rect('[data-testid=cancel]')) }
await clickRegion()
await waitFor('[data-testid=tiles] button')
out.change.tilesCounter = await text('[data-testid^=onboarding-] > div > div > div')
await click('[data-testid=tiles-next]')
await waitFor('[data-testid=preview]')
await waitFor('[data-testid=number]', 20_000)
out.change.readyCounter = await text('[data-testid^=onboarding-] > div > div > div')
out.change.readyButton = await text('[data-testid=go]')
out.change.hasNext = !!(await rect('[data-testid=ready-next]'))
await shot('c5-change-3-ready')
await click('[data-testid=go]')
out.change.atlasMs = await waitFor('[data-testid=bar]', 30_000)
out.change.url = await evaluate('location.pathname')

// ── C3: location denied, then a point outside every region ─────────────────────
await send('Page.navigate', { url: `${base}/${locale}/onboarding` })
await waitFor('[data-testid=regions] button', 20_000)
await send('Browser.grantPermissions', { permissions: [] , origin: base }).catch(() => null)
await send('Emulation.setGeolocationOverride', {}) // no coordinates: position unavailable
await click('[data-testid=locate]')
const deniedMs = await waitFor('[data-testid=region-error]', 20_000)
out.denied = { ms: deniedMs, error: await text('[data-testid=region-error]'), regionsStill: await evaluate(`document.querySelectorAll('[data-testid=regions] button:not([disabled])').length`), searchField: await evaluate(`!!document.querySelector('[data-testid=place]')`) }
await shot('c3-denied')
await send('Browser.grantPermissions', { permissions: ['geolocation'], origin: base })
await send('Emulation.setGeolocationOverride', { latitude: 48.8566, longitude: 2.3522, accuracy: 50 }) // Paris
await click('[data-testid=locate]')
await sleep(300)
const outsideMs = await waitText('/nicht verfügbar|not available/', 30_000)
out.outside = { ms: outsideMs, error: await text('[data-testid=region-error]'), regionsStill: await evaluate(`document.querySelectorAll('[data-testid=regions] button:not([disabled])').length`), searchField: await evaluate(`!!document.querySelector('[data-testid=place]')`), step: await step() }
await shot('c3-outside')
// And the region button still works after the errors
await clickRegion()
out.outside.buttonThenStep = (await waitFor('[data-testid=tiles]', 10_000)) !== null ? await step() : null

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
