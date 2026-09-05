// C1 and the onboarding shots (handoff 0007 Track A): a fresh headless Chrome (no dex_id cookie, so the context mints a
// fresh identity) walks the three screens by text lookup and lands on the grid. Prints the elapsed time, the identity id
// and every screenshot path. Built on scripts/shot.mjs (CDP, no dependency).
// usage: node scripts/m5a/onboarding.mjs <de|en> <light|dark> <390|360> <outDir> [query=Bingen] [baseUrl=http://localhost:3002]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [locale = 'de', scheme = 'light', widthArg = '390', outDir = '.', query = 'Bingen', base = 'http://localhost:3002'] = process.argv.slice(2)
const width = Number(widthArg)
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
  throw new Error(`timeout waiting for ${selector}`)
}
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
mkdirSync(outDir, { recursive: true })
const suffix = `${locale}-${scheme}${width === 390 ? '' : `-${width}`}`
const shot = async (name) => {
  await evaluate(`document.querySelector('nextjs-portal')?.remove()`)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  const file = join(outDir, `a-onboard-${name}-${suffix}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  console.log(file)
}

await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
const t0 = Date.now()
await send('Page.navigate', { url: `${base}/${locale}/onboarding` })
await waitFor('[data-testid=locate]')
await sleep(2500) // the splash photo
await shot('1-region')
await click('[data-testid=locate] + p + button') // "Ort eingeben"
await waitFor('[data-testid=place]')
await evaluate(`document.querySelector('[data-testid=place]').focus()`)
await send('Input.insertText', { text: query })
await waitFor('[data-testid=places] button')
await sleep(300)
await shot('1-region-search')
await click('[data-testid=places] button')
await waitFor('[data-testid=onboarding-tiles]')
await waitFor('[data-tile=bird] span span:nth-child(2):not(:empty)', 15_000).catch(() => {}) // counts, when the region is ready
await sleep(300)
await shot('2-tiles')
await click('[data-testid=tiles-next]')
await waitFor('[data-testid=onboarding-ready]')
await waitFor('[data-testid=preview] img', 15_000).catch(() => {})
await sleep(2500) // the nine images
await shot('3-ready')
await click('[data-testid=go]')
await waitFor('[data-testid=grid] li', 60_000)
const seconds = (Date.now() - t0) / 1000
await sleep(2500)
await shot('4-grid')
const { cookies } = await send('Network.getCookies', { urls: [base] })
console.log(JSON.stringify({ seconds, identity: cookies.find((c) => c.name === 'dex_id')?.value ?? null, cells: await evaluate(`document.querySelectorAll('[data-testid=grid] li').length`), counters: await evaluate(`document.querySelector('[data-testid=counters]')?.textContent`) }))
ws.close(); proc.kill()
