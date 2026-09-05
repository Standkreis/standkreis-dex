// Handoff 0006 C9 (export, both states) and C10 (delete, two steps, cookie cleared).
// usage: node scripts/m7/data-e2e.mjs [baseUrl]
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFileSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:3001'
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const here = dirname(fileURLToPath(import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const seed = (...args) => execFileSync('npx', ['tsx', join(here, 'seed.mts'), ...args], { cwd: join(here, '../..'), encoding: 'utf8' }).trim()
const log = (...a) => console.log(...a)

// ── C9 over plain HTTP with a cookie jar of one ──────────────────────────────
const cookieOf = (res) => res.headers.get('set-cookie')?.match(/dex_id=([^;]*)/)?.[1]
const query = (path, cookie) => fetch(`${base}/api/trpc/${path}`, { headers: cookie ? { cookie: `dex_id=${cookie}` } : {} })
const mutate = (path, input, cookie) => fetch(`${base}/api/trpc/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: `dex_id=${cookie}` }, body: JSON.stringify({ json: input }) })

const first = await query('identity.me')
const id = cookieOf(first)
log('C9 identity        ', id)
log(seed('sightings', id, '2'))
log(seed('studies', id, '1'))
await mutate('identity.setName', { displayName: 'Sven' }, id)
const anon = await query('data.export', id).then((r) => r.text())
const anonJson = JSON.parse(anon).result.data.json
writeFileSync('/tmp/m7-export-anonymous.json', JSON.stringify(anonJson, null, 2))
log('C9 anonymous export: sightings', anonJson.sightings.length, 'studies', anonJson.studies.length, 'devices', anonJson.identity.devices, 'displayName key present:', 'displayName' in anonJson.identity)
log(seed('passkeys', id, '1'))
const synced = await query('data.export', id).then((r) => r.json()).then((j) => j.result.data.json)
writeFileSync('/tmp/m7-export-synced.json', JSON.stringify(synced, null, 2))
log('C9 synced export:    sightings', synced.sightings.length, 'studies', synced.studies.length, 'devices', synced.identity.devices, 'displayName:', synced.identity.displayName)
log('C9', anonJson.sightings.length === 2 && anonJson.studies.length === 1 && !('displayName' in anonJson.identity) && synced.identity.displayName === 'Sven' ? 'PASS' : 'FAIL')
log('cleanup:', seed('cleanup', id))

// ── C10 through the real sheet in headless Chrome ────────────────────────────
const port = 9300 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-e2e-del-${port}`, 'about:blank'], { stdio: 'ignore' })
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  target = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).then((t) => t.find((x) => x.type === 'page')).catch(() => undefined)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let mid = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((r) => { pending.set(++mid, r); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaluate = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).then((r) => r.result.value)
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: base + '/de/you' }); await sleep(2500)
  const del = await evaluate(`fetch('/api/trpc/identity.me').then(r => r.json()).then(j => j.result.data.json.id)`)
  log('C10 identity       ', del)
  log(seed('passkeys', del, '2'))
  log(seed('sightings', del, '14'))
  log('C10 before         ', seed('show', del))
  await send('Page.navigate', { url: base + '/de/settings' }); await sleep(2500)
  await evaluate(`document.querySelector('[data-testid=delete]').click()`); await sleep(1500)
  const summary = await evaluate(`document.querySelector('[data-testid=delete-summary]')?.textContent`)
  log('C10 first call says', JSON.stringify(summary))
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync('/tmp/m7-delete-sheet.png', Buffer.from(data, 'base64'))
  await evaluate(`document.querySelector('[data-testid=delete-confirm]').click()`); await sleep(2000)
  const { cookies } = await send('Network.getCookies', { urls: [base] })
  const dexCookie = cookies.find((c) => c.name === 'dex_id')
  log('C10 after          ', seed('show', del))
  log('C10 cookie dex_id  ', dexCookie ? `${dexCookie.value} (${dexCookie.value === del ? 'STILL OLD' : 'new identity minted by the refetch'})` : 'cleared')
  log('C10 notice         ', await evaluate(`document.querySelector('[data-testid=notice]')?.textContent`))
  log('C10', summary === '2 Geräte · 14 Sichtungen' && dexCookie?.value !== del ? 'PASS' : 'FAIL')
  if (dexCookie && dexCookie.value !== del) log('cleanup:', seed('cleanup', dexCookie.value))
} finally { ws.close(); proc.kill() }
