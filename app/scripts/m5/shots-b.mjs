// Track B shots (handoff 0007 C6–C9): headless Chrome over CDP, no dependencies. Extends scripts/shot.mjs with width,
// a dex_id cookie, full-page capture, and two actions: a long-press on the lead image, a tap on the Studiert button.
// usage: node scripts/m5/shots-b.mjs <path> <out.png> [--w 390] [--h 844] [--dark] [--full] [--id dex_id] [--action longpress|study|caption] [--base http://localhost:3003]
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const [route = '/de', out = 'shot.png'] = args.filter((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--') || ['--dark', '--full'].includes(args[args.indexOf(a) - 1]))
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d }
const flag = (k) => args.includes(`--${k}`)
const width = Number(opt('w', 390)), height = Number(opt('h', 844)), scheme = flag('dark') ? 'dark' : 'light'
const dexId = opt('id', ''), action = opt('action', ''), base = opt('base', 'http://localhost:3003'), full = flag('full')

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-shot-${port}`, 'about:blank'], { stdio: 'ignore' })
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
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))?.result?.value

await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
if (dexId) await send('Network.setCookie', { name: 'dex_id', value: dexId, url: base, httpOnly: true, sameSite: 'Lax' })
await send('Page.navigate', { url: base + route })
await sleep(3000)
for (let i = 0; i < 20; i++) { if (await evaluate(`[...document.images].every((i) => i.complete)`)) break; await sleep(300) }
await evaluate(`document.querySelector('nextjs-portal')?.remove()`)

const rect = async (sel) => evaluate(`(() => { const r = document.querySelector('${sel}')?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null })()`)
if (action === 'longpress') {
  const p = await rect('[data-testid="slider"] img')
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 })
  await sleep(800)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 })
  await sleep(400)
} else if (action === 'study' || action === 'caption') {
  const p = await rect(action === 'study' ? '[data-testid="study"]' : '[data-testid="caption"]')
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 })
  await sleep(1500)
}
let clip
if (full) {
  const h = await evaluate('document.documentElement.scrollHeight')
  await send('Emulation.setDeviceMetricsOverride', { width, height: h, deviceScaleFactor: 2, mobile: true })
  await sleep(1500) // lazy images below the fold
  clip = { x: 0, y: 0, width, height: h, scale: 1 }
}
const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, clip })
writeFileSync(out, Buffer.from(data, 'base64'))
const text = await evaluate(`(() => { const s = document.querySelector('[data-testid="state"]')?.innerText; const q = document.querySelector('[data-testid="sources"]')?.innerText; const st = document.querySelector('[data-testid="study"]')?.innerText; const a = document.querySelector('[data-testid="attribution"]'); return JSON.stringify({ state: s, sources: q, study: st, attribution: a ? a.innerText.replace(/\\n/g, ' | ') : null, links: a ? [...a.querySelectorAll('a')].map((l) => l.href) : [] }) })()`)
ws.close(); proc.kill()
console.log(out, text)
