// C1 of handoff 0012 Track 0: the onboarding's place search when `dex.lookupRegion` fails (the server started with
// DATABASE_URL on a dead port). Headless Chrome over CDP: type, time the error line, type again, see the retry.
// usage: node scripts/m12/onboarding.mjs [de|en] [outDir] [baseUrl]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [locale = 'de', outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(outDir, { recursive: true })
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m12o-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const lookups = [] // every dex.lookupRegion request the page sent, with its answer
const byRequest = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); return }
  if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('dex.lookupRegion')) { const l = { at: Date.now(), q: decodeURIComponent(m.params.request.url.split('input=')[1] ?? '').slice(0, 60) }; byRequest.set(m.params.requestId, l); lookups.push(l) }
  if (m.method === 'Network.responseReceived' && byRequest.has(m.params.requestId)) { const l = byRequest.get(m.params.requestId); l.status = m.params.response.status; l.ms = Date.now() - l.at }
}
const raw = (method, params = {}, sessionId) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })) })
const { targetInfos } = await raw('Target.getTargets')
const page = targetInfos.find((t) => t.type === 'page')
const { sessionId } = await raw('Target.attachToTarget', { targetId: page.targetId, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable')
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(50) }; return null }
const shot = async (name) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `t0-${name}-${locale}-light.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const state = () => evaluate(`(() => ({ url: location.pathname, input: document.querySelector('[data-testid=place]')?.value ?? null, editable: !document.querySelector('[data-testid=place]')?.disabled, list: [...document.querySelectorAll('[data-testid=places] li')].map((li) => li.textContent.trim()), error: document.querySelector('[data-testid=place-error]')?.textContent ?? null, working: document.body.innerText.includes('Einen Moment') || document.body.innerText.includes('One moment') }))()`)

const out = { locale, base }
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: `${base}/${locale}/onboarding` })
out.onboarding = { headline: (await waitFor('h1', 20_000)) !== null, body: await evaluate('document.body.innerText.slice(0, 120)') }
// "Ort eingeben" / "Type a place": the second button on the region screen (no test id of its own).
await evaluate(`[...document.querySelectorAll('button')].find((b) => /Ort eingeben|Type a place/.test(b.textContent)).click()`)
await waitFor('[data-testid=place]')
await evaluate(`document.querySelector('[data-testid=place]').focus()`)
await send('Input.insertText', { text: 'Mainz' })
const firstError = await waitFor('[data-testid=place-error]', 10_000)
out.first = { typedToErrorMs: firstError === null ? 'never' : firstError, requests: lookups.length, ...(await state()) }
await shot('c1-error')
// Typing again: a new key, a new request, the error again (the DB is still dead); the input kept what was typed.
const before = lookups.length
await send('Input.insertText', { text: '-Bingen' })
await sleep(400) // past the 300 ms debounce
const gone = await evaluate(`!document.querySelector('[data-testid=place-error]')`) // the old query's error is not shown for the new key
const secondError = await waitFor('[data-testid=place-error]', 10_000)
out.second = { typedToErrorMs: secondError === null ? 'never' : secondError, newRequests: lookups.length - before, errorClearedWhileFetching: gone, ...(await state()) }
out.spinnerAfter3s = await (async () => { await sleep(3000); return (await state()).working })()
out.lookups = lookups
console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
