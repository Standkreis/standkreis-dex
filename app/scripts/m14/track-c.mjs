// Handoff 0014 Track C, C8 on the production build, headless Chrome over CDP (as scripts/m14/ui.mjs).
// A fresh identity in Mainz-Bingen with one seen and one studied species, then: the per-group rows on the profile (P3),
// an avatar upload through the file input (P2: square crop ≤ 256 px, served by /api/photo, still there after a reload,
// replaced on re-upload with the old file gone), the region link into onboarding's change mode (P2), and the identity's
// deletion taking the avatar file with it. Store on disk: PHOTO_DIR (default app/data/photos), no Blob token in the worktree.
// usage: node scripts/m14/track-c.mjs [outDir] [baseUrl]   env: JPEG (fixture, default public/splash.jpg, 1440 × 2640)
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const locale = 'de'
const regionId = process.env.REGION ?? '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const SEEN_KEY = +(process.env.SEEN ?? 5147038) // Idaea bilinearia (insect)
const STUDIED_KEY = +(process.env.STUDIED ?? 1340542) // Bombus hortorum (insect)
const fixture = resolve(process.env.JPEG ?? 'public/splash.jpg')
const photoDir = resolve(process.env.PHOTO_DIR ?? 'data/photos')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base, fixture }
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
const photo = async (url) => {
  const r = await fetch(`${base}${url}`, { headers: { cookie } })
  const body = r.status === 200 ? new Uint8Array(await r.arrayBuffer()) : null
  return { status: r.status, type: r.headers.get('content-type'), cache: r.headers.get('cache-control'), bytes: body?.length ?? 0, jpeg: !!body && body[0] === 0xff && body[1] === 0xd8 }
}
const onDisk = (url) => existsSync(join(photoDir, `${url.split('/').pop()}.jpg`))

// ── Chrome over CDP ────────────────────────────────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m14c-${port}`, 'about:blank'], { stdio: 'ignore' })
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
await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable')
const [name, value] = cookie.split('=')
await send('Network.setCookie', { name, value, url: base })
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(50) }; return null }
const waitPath = async (re, t = 15_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`${re}.test(location.pathname + location.search)`)) return Date.now() - s; await sleep(50) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const style = (selector, props) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const c = getComputedStyle(el); return Object.fromEntries(${JSON.stringify(props)}.map((p) => [p, c[p]])) })()`)
const goto = async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return waitFor(sel) }
const setFile = async (selector, path) => {
  const { root } = await send('DOM.getDocument', { depth: 1 })
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector })
  return send('DOM.setFileInputFiles', { nodeId, files: [path] })
}
const avatarInfo = () => evaluate(`(() => { const i = document.querySelector('[data-testid=avatar-image]'); return i ? { src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight, complete: i.complete } : null })()`)
const waitAvatar = async (notSrc, t = 15_000) => { const s = Date.now(); while (Date.now() - s < t) { const a = await avatarInfo(); if (a && a.src !== notSrc && a.complete && a.w) return a; await sleep(100) }; return null }

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

// ── P3 · the per-group rows ──────────────────────────────────────────────────────────────────────────────────────
await goto('/you', '[data-testid=groups] li')
await sleep(1200)
out.p3 = {
  rows: await evaluate(`[...document.querySelectorAll('[data-testid=groups] li')].map((li) => ({ tile: li.dataset.testid.slice(6), name: li.querySelector('span').innerText, studied: +li.dataset.studied, seen: +li.dataset.seen, possible: +li.dataset.possible, text: li.querySelector('div > span + span').innerText, studiedBar: { w: li.querySelector('[data-testid=bar-studied]').style.width, bg: getComputedStyle(li.querySelector('[data-testid=bar-studied]')).backgroundColor }, seenBar: { w: li.querySelector('[data-testid=bar-seen]').style.width, bg: getComputedStyle(li.querySelector('[data-testid=bar-seen]')).backgroundColor } }))`),
  barHeight: (await style('[data-testid=bar-studied]', ['height']))?.height,
  counters: await evaluate(`document.querySelector('[data-testid=counters]')?.innerText`),
}
out.p3.sumPossible = out.p3.rows.reduce((n, r) => n + r.possible, 0)
await evaluate(`document.querySelector('[data-testid=groups]').scrollIntoView({ block: 'start' })`); await sleep(300)
await shot('c-p3-groups')

// ── P2 · avatar: upload through the input, crop, reload, replace ───────────────────────────────────────────────
await goto('/you', '[data-testid=avatar]')
await sleep(500)
out.p2 = { before: { image: await avatarInfo(), initials: await evaluate(`document.querySelector('[data-testid=avatar]')?.innerText`) } }
await setFile('[data-testid=avatar-input]', fixture)
const first = await waitAvatar(null)
out.p2.first = { image: first, state: await evaluate(`document.querySelector('[data-testid=avatar-state]')?.innerText ?? null`), served: first && (await photo(first.src)), onDisk: first && onDisk(first.src), me: (await trpc('identity.me', undefined, 'GET')).data?.avatarUrl }
await shot('c-p2-avatar')
await send('Page.reload'); await waitFor('[data-testid=avatar-image]'); await sleep(800)
out.p2.afterReload = await avatarInfo()
await setFile('[data-testid=avatar-input]', fixture)
const second = await waitAvatar(first?.src)
out.p2.second = { image: second, me: (await trpc('identity.me', undefined, 'GET')).data?.avatarUrl, served: second && (await photo(second.src)), onDisk: second && onDisk(second.src), oldServed: first && (await photo(first.src)), oldOnDisk: first && onDisk(first.src) }
out.p2.setAvatarForeign = await trpc('identity.setAvatar', { assetId: '00000000-0000-4000-8000-000000000000' })
await evaluate(`window.scrollTo(0, 0)`); await sleep(200)
await shot('c-p2-avatar-replaced')

// ── P2 · region change: the link lands on onboarding step 1 in change mode ─────────────────────────────────────
await click('[data-testid=change-region]')
const changeMs = await waitPath('/\\/onboarding\\?change=1$/')
await waitFor('[data-testid=onboarding-region]'); await waitFor('[data-testid=regions] button'); await sleep(600)
out.p2.regionChange = { ms: changeMs, landed: await evaluate('location.pathname + location.search'), step: await evaluate(`document.querySelector('[data-testid^=onboarding-]')?.dataset.testid`), of: await evaluate(`document.body.innerText.match(/\\d+\\s*(von|of)\\s*\\d+/)?.[0] ?? null`) }
await shot('c-p2-change-region')

// ── delete: the avatar file goes with the identity ─────────────────────────────────────────────────────────────
const prep = await trpc('data.delete', null)
const done = await trpc('data.delete', { token: prep.data?.token })
await sleep(300)
out.p2.afterDelete = { step: done.data?.step, served: second && (await photo(second.src)), onDisk: second && onDisk(second.src) }

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
