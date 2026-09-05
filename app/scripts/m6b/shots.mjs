// Track B shots and checks (handoff 0008 C8–C10): headless Chrome over CDP, no dependencies, as scripts/m5/shots-b.mjs.
// usage: node scripts/m6b/shots.mjs <path> <out.png|-> [--w 390] [--h 844] [--dark] [--full] [--id dex_id] [--base http://localhost:3003]
//        [--action pill:<all|studied|seen> | note:<text> | wildness:<wild|captive> | delete | confirm]
// Prints a JSON line with what the page shows (day labels, places, rows with chip and meta; or the sighting's fields).
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const positional = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1]?.startsWith('--') && !['--dark', '--full'].includes(args[i - 1])))
const [route = '/de/journal', out = '-'] = positional
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d }
const flag = (k) => args.includes(`--${k}`)
const width = Number(opt('w', 390)), height = Number(opt('h', 844)), scheme = flag('dark') ? 'dark' : 'light'
const dexId = opt('id', '00000000-0000-4000-8000-00000000006b'), action = opt('action', ''), base = opt('base', 'http://localhost:3003'), full = flag('full')

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m6b-${port}`, 'about:blank'], { stdio: 'ignore' })
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
const waitFor = async (selector, ms = 30_000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return true; await sleep(150) }
  return false
}
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
const type = async (selector, text) => {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await sleep(250)
}

await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
await send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Berlin' })
if (dexId) await send('Network.setCookie', { name: 'dex_id', value: dexId, url: base, httpOnly: true, sameSite: 'Lax' })
// One retry: the dev server answers a 404 or stalls for the first request after a recompile.
for (let i = 0; i < 2; i++) {
  await send('Page.navigate', { url: base + route })
  if (await waitFor('[data-testid=day], [data-testid=empty], [data-testid=sighting], [data-testid=grid], [data-testid=counters]', 20_000)) break
}
await sleep(800)
for (let i = 0; i < 20; i++) { if (await evaluate(`[...document.images].every((i) => i.complete)`)) break; await sleep(300) }

const [kind, arg] = action.split(':')
if (kind === 'pill') { await click(`[data-testid=pill-${arg}]`); await sleep(1200) }
if (kind === 'note') { await type('[data-testid=note]', arg); await sleep(300); await click('[data-testid=save]'); await waitFor('[data-testid=saved]', 10_000); await sleep(300) }
if (kind === 'wildness') { await click(`[data-testid=wildness-${arg}]`); await sleep(300); await click('[data-testid=save]'); await waitFor('[data-testid=saved]', 10_000); await sleep(300) }
if (kind === 'delete') { await click('[data-testid=delete]'); await waitFor('[data-testid=confirm]'); await sleep(300) }
if (kind === 'confirm') { await click('[data-testid=delete]'); await waitFor('[data-testid=confirm]'); await click('[data-testid=delete-yes]'); await waitFor('[data-testid=day], [data-testid=empty]', 15_000); await sleep(1500) }
await evaluate(`document.querySelector('nextjs-portal')?.remove()`)

if (out !== '-') {
  let clip
  if (full) {
    const h = await evaluate('document.documentElement.scrollHeight')
    await send('Emulation.setDeviceMetricsOverride', { width, height: h, deviceScaleFactor: 2, mobile: true })
    await sleep(1200)
    clip = { x: 0, y: 0, width, height: h, scale: 1 }
  }
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, clip })
  writeFileSync(out, Buffer.from(data, 'base64'))
}
const text = await evaluate(`(() => {
  const q = (s, el = document) => el.querySelector(s)?.innerText ?? null
  const days = [...document.querySelectorAll('[data-testid=day]')].map((d) => ({ label: q('[data-testid=day-label]', d), places: q('[data-testid=day-places]', d), rows: [...d.querySelectorAll('[data-testid=row]')].map((r) => ({ kind: r.dataset.kind, name: r.querySelector('span.truncate')?.innerText, chip: q('[data-testid=chip]', r), meta: q('[data-testid=meta]', r), grey: !!r.querySelector('img.grayscale'), ring: !!r.querySelector('.ring-amber') })) }))
  const sighting = document.querySelector('[data-testid=sighting]') ? { url: location.pathname, title: q('h1'), chip: q('[data-testid=chip]'), when: q('[data-testid=when]'), place: q('[data-testid=place]'), map: !!document.querySelector('[data-testid=map]'), caption: q('[data-testid=caption]'), note: document.querySelector('[data-testid=note]')?.value, wildness: [...document.querySelectorAll('[role=radio]')].find((b) => b.getAttribute('aria-checked') === 'true')?.innerText, confirm: q('[data-testid=confirm]') } : null
  return JSON.stringify({ url: location.pathname + location.search, empty: q('[data-testid=empty]'), pills: [...document.querySelectorAll('[role=tab]')].map((b) => b.innerText + (b.getAttribute('aria-selected') === 'true' ? '*' : '')), days, sighting, counters: q('[data-testid=counters]'), more: !!document.querySelector('[data-testid=more]') })
})()`)
ws.close(); proc.kill()
console.log(out !== '-' ? out : '', text)
