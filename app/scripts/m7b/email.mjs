// Handoff 0020 checks, against the production build (`npm run build` + `next start -p 3002`, dev DB, disk photos), headless
// Chrome over CDP as scripts/m18/regions.mjs. The server must be started with RESEND_API_KEY=<anything> and
// RESEND_BASE_URL=http://localhost:3107: this script runs the Resend stub on :3107 and records every POST /emails.
//   node scripts/m7b/email.mjs run [outDir] [baseUrl]   C1 attach on device A · C2 sign-in on device B with the same address (merge,
//                                                        cookie, notice, sightings) · C3 wrong ×5, expired · C4 throttle · C6 delete
//   node scripts/m7b/email.mjs c5                        dev without the key (`next dev -p 3013`: the log line, no network) and the
//                                                        production build without it (`next start -p 3014`: refuses to start)
// Nothing here prints a key; the addresses are <check>-<run>@example.com so a rerun within the hour is not throttled.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'node:http'
import pg from 'pg'

const [mode = 'run', outDir = '../docs/handoffs/0020-shots', base = 'http://localhost:3002'] = process.argv.slice(2)
const locale = process.env.LOCALE ?? 'de'
const STUB_PORT = 3107
const DB = process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex'
const run = Math.random().toString(36).slice(2, 8)
const addr = (tag) => `${tag}-${run}@example.com`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base, run }
const codeOf = (mail) => mail?.text?.match(/\b(\d{6})\b/)?.[1]

// ── the Resend stub: records what the SDK posts, answers like the API ──────────────────────────────────────────────
const mails = []
const stub = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    if (req.method === 'POST' && req.url === '/emails') {
      mails.push({ auth: /^Bearer .+/.test(req.headers.authorization ?? '') ? 'bearer' : 'none', ua: req.headers['user-agent'], ...JSON.parse(body) })
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: `stub-${mails.length}` }))
    } else { res.writeHead(404); res.end('{}') }
  })
})
await new Promise((r) => stub.listen(STUB_PORT, r))

// ── tRPC with a cookie jar per "device" ────────────────────────────────────────────────────────────────────────────
const device = (b = base) => {
  const d = { cookie: '', id: null }
  d.call = async (path, input, method = 'POST') => {
    const r = method === 'GET'
      ? await fetch(`${b}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input ?? null } }))}`, { headers: { cookie: d.cookie } })
      : await fetch(`${b}/api/trpc/${path}?batch=1`, { method, headers: { 'content-type': 'application/json', cookie: d.cookie }, body: JSON.stringify({ 0: { json: input } }) })
    const set = r.headers.get('set-cookie')?.match(/dex_id=([^;]*)/)
    if (set) d.cookie = `dex_id=${set[1]}`
    const j = await r.json()
    return { status: r.status, ...(j[0].result?.data?.json !== undefined ? { data: j[0].result.data.json } : { error: j[0].error?.json?.message, code: j[0].error?.json?.data?.code }) }
  }
  d.me = async () => { const r = await d.call('identity.me', undefined, 'GET'); d.id = r.data?.id; return r.data }
  return d
}
const db = new pg.Client({ connectionString: DB }); await db.connect()
const count = async (sql, params = []) => Number((await db.query(sql, params)).rows[0].n)

if (mode === 'c5') {
  // ── C5 · dev without the key: the log line, no network; prod build without it: refuses to start naming the variable ─
  const env = { ...process.env, RESEND_API_KEY: '', RESEND_BASE_URL: `http://localhost:${STUB_PORT}` }
  const capture = (proc) => { let log = ''; proc.stdout.on('data', (c) => (log += c)); proc.stderr.on('data', (c) => (log += c)); return () => log }
  const dev = spawn('npx', ['next', 'dev', '-p', '3013'], { env, cwd: process.cwd() })
  const devLog = capture(dev)
  for (let i = 0; i < 300; i++) { await sleep(500); if (await fetch('http://localhost:3013/api/health').then((r) => r.ok).catch(() => false)) break }
  const d = device('http://localhost:3013')
  await d.me()
  const started = await d.call('identity.emailStart', { email: addr('c5') })
  await sleep(500)
  const line = devLog().split('\n').find((l) => l.includes('[mail] code for'))
  const code = line?.match(/: (\d{6})/)?.[1]
  const verified = code ? await d.call('identity.emailVerify', { code }) : null
  out.c5 = { dev: { started, logLine: line?.replace(/\d{6}/, '······'), stubMails: mails.length, verifiedWithLoggedCode: verified?.data ?? verified } }
  dev.kill('SIGTERM'); await sleep(1000)
  const prod = spawn('npx', ['next', 'start', '-p', '3014'], { env, cwd: process.cwd() })
  const prodLog = capture(prod)
  const exit = await new Promise((r) => { prod.on('exit', (c) => r(c)); setTimeout(() => { prod.kill('SIGTERM'); r('still up after 20 s') }, 20_000) })
  out.c5.prod = { exit, log: prodLog().split('\n').filter((l) => l.includes('[env]') || l.includes('RESEND')).join('\n') }
  console.log(JSON.stringify(out, null, 2))
  stub.close(); await db.end(); process.exit(0)
}

// ── Chrome over CDP: two browser contexts, one per device ──────────────────────────────────────────────────────────
mkdirSync(outDir, { recursive: true })
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m7b-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id) } }
const raw = (method, params = {}, sessionId) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })) })

const openDevice = async (d, name) => {
  const { browserContextId } = await raw('Target.createBrowserContext')
  const { targetId } = await raw('Target.createTarget', { url: 'about:blank', browserContextId })
  const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true })
  const send = (method, params = {}) => raw(method, params, sessionId)
  await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  const [n, v] = d.cookie.split('=')
  await send('Network.setCookie', { name: n, value: v, url: base })
  const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
  const p = {
    name, send, evaluate,
    waitFor: async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(50) }; return null },
    waitGone: async (selector, t = 5_000) => { const s = Date.now(); while (Date.now() - s < t) { if (!(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))) return Date.now() - s; await sleep(50) }; return null },
    click: (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`),
    text: (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`),
    attr: (selector, a) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.getAttribute(${JSON.stringify(a)}) ?? null`),
    type: async (selector, text) => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`); await send('Input.insertText', { text }) },
    shot: async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) },
    goto: async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return p.waitFor(sel) },
    cookieId: async () => (await send('Network.getCookies', { urls: [base] })).cookies.find((c) => c.name === 'dex_id')?.value ?? null,
  }
  p.waitText = async (selector, re, t = 15_000) => { const s = Date.now(); while (Date.now() - s < t) { const v = await p.text(selector); if (v && re.test(v)) return Date.now() - s; await sleep(50) }; return null }
  return p
}
// Attach through the form on screen: address → send → the stub's code → verify. Returns what the row or the notice says.
const attachOnScreen = async (p, email, prefix) => {
  await p.type('[data-testid=email-address]', email)
  await p.shot(`${prefix}-address`)
  const before = mails.length
  await p.click('[data-testid=email-send]')
  await p.waitFor('[data-testid=email-code]')
  for (let i = 0; i < 40 && mails.length === before; i++) await sleep(100)
  const mail = mails[mails.length - 1]
  const sentLine = await p.text('[data-testid=email-sent]')
  const resendWait = await p.text('[data-testid=email-resend-wait]')
  await p.shot(`${prefix}-sent`)
  await p.type('[data-testid=email-code]', codeOf(mail))
  await p.click('[data-testid=email-verify]')
  return { mailsBefore: before, mailsAfter: mails.length, sentLine, resendWait, inputMode: await p.attr('[data-testid=email-code]', 'inputmode'), autocomplete: await p.attr('[data-testid=email-code]', 'autocomplete') }
}

// ── seed: a ready region, a taxon, device A with two sightings, device B with three ─────────────────────────────────
const A = device(), B = device()
await A.me(); await B.me()
const regions = (await A.call('dex.regions', undefined, 'GET')).data
const region = regions.find((r) => r.status === 'ready' && r.name.startsWith('Mainz')) ?? regions.find((r) => r.status === 'ready')
const tiles = ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish']
const set = (await A.call('dex.set', { regionId: region.id, tiles, nowOnly: false }, 'GET')).data
const taxa = set.species.slice(0, 5).map((s) => s.taxonId)
for (const d of [A, B]) await d.call('identity.setFilter', { regionId: region.id, regionIds: [region.id], tiles, nowOnly: false })
const log = async (d, taxonId, daysAgo) => d.call('sighting.create', { taxonId, at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(), wildness: 'wild' })
await log(A, taxa[0], 3); await log(A, taxa[1], 2)
await log(B, taxa[1], 5); await log(B, taxa[2], 1); await log(B, taxa[3], 1) // taxa[1] again: a different instant, so it is kept (merge dedups by [taxon, at])
const sightingsOf = (d) => d.call('data.export', undefined, 'GET').then((r) => r.data.sightings.length)
out.seed = { region: region.name, a: A.id, b: B.id, sightingsA: await sightingsOf(A), sightingsB: await sightingsOf(B) }

// ── C1 · attach on device A ─────────────────────────────────────────────────────────────────────────────────────────
const pa = await openDevice(A, 'A')
const shared = addr('a')
await pa.goto('/settings', '[data-testid=email-attach]')
await sleep(600)
out.c1 = { rowBefore: await pa.attr('[data-testid=email-row]', 'data-state'), cardBefore: await pa.attr('[data-testid=identity-card]', 'data-state'), localBody: await pa.text('[data-testid=identity-card] p'), signInLine: await pa.text('[data-testid=passkey-signin]') }
await pa.shot('c1-row')
await pa.click('[data-testid=email-attach]')
await pa.waitFor('[data-testid=email-address]')
out.c1.form = await attachOnScreen(pa, shared, 'c1')
await pa.waitFor('[data-testid=email-row][data-state=verified]', 10_000)
await sleep(500)
const m1 = mails[0]
out.c1.mail = { count: mails.length, from: m1.from, to: m1.to, subject: m1.subject.replace(/\d{6}/, '······'), auth: m1.auth, ua: m1.ua, hasText: !!m1.text, hasHtml: !!m1.html, codeInHtml: m1.html.includes(codeOf(m1)), replyTo: m1.reply_to ?? null, tags: m1.tags ?? null, headers: m1.headers ?? null, trackingFlags: Object.keys(m1).filter((k) => /track/i.test(k)), linksInHtml: (m1.html.match(/<a\b/g) ?? []).length, imgsInHtml: (m1.html.match(/<img\b/g) ?? []).length, textBody: m1.text.replace(/\d{6}/, '······') }
out.c1.after = { rowState: await pa.attr('[data-testid=email-row]', 'data-state'), rowValue: await pa.text('[data-testid=email-value]'), cardState: await pa.attr('[data-testid=identity-card]', 'data-state'), title: await pa.text('[data-testid=identity-title]'), notice: await pa.text('[data-testid=notice]'), me: (await A.me()).email, exportEmail: (await A.call('data.export', undefined, 'GET')).data.identity.email }
await pa.shot('c1-verified')

// ── C2 · sign-in on device B with the same address: B folds into A ──────────────────────────────────────────────────
const pb = await openDevice(B, 'B')
await pb.goto('/settings', '[data-testid=passkey-signin]')
await sleep(600)
out.c2 = { before: { cookie: await pb.cookieId(), sightingsA: await sightingsOf(A), sightingsB: await sightingsOf(B), identities: await count('select count(*) as n from "Identity" where id = any($1)', [[A.id, B.id]]) } }
await pb.click('[data-testid=passkey-signin]')
await pb.waitFor('[data-testid=signin-sheet]'); await sleep(400)
out.c2.sheet = { passkey: await pb.text('[data-testid=signin-passkey]'), email: await pb.text('[data-testid=signin-email]') }
await pb.shot('c2-sheet')
await pb.click('[data-testid=signin-email]')
await pb.waitFor('[data-testid=email-address]')
out.c2.form = await attachOnScreen(pb, shared, 'c2')
out.c2.sheetClosedMs = await pb.waitGone('[data-testid=signin-sheet]', 10_000)
await pb.waitFor('[data-testid=notice]', 10_000)
await sleep(800)
B.cookie = `dex_id=${await pb.cookieId()}`
out.c2.after = { cookie: await pb.cookieId(), cookieIsA: (await pb.cookieId()) === A.id, notice: await pb.text('[data-testid=notice]'), rowValue: await pb.text('[data-testid=email-value]'), sightingsUnderA: await sightingsOf(A), sightingsSeenByB: await sightingsOf(B), bGone: await count('select count(*) as n from "Identity" where id = $1', [B.id]) === 0, meB: (await B.me()).id }
await pb.shot('c2-adopted')
await pb.goto('/journal', '[data-testid=day]'); await sleep(800)
out.c2.journalDays = await pb.evaluate(`[...document.querySelectorAll('[data-testid=day]')].length`)
await pb.shot('c2-journal')

// ── C3 · wrong ×5 → dead, the 6th correct refused; expired refused ──────────────────────────────────────────────────
const C = device(); await C.me()
const c3 = addr('c3')
const started = await C.call('identity.emailStart', { email: c3 })
const c3code = codeOf(mails[mails.length - 1])
const wrong = ('000000' === c3code ? '000001' : '000000')
out.c3 = { start: started, wrong: [] }
for (let i = 0; i < 5; i++) out.c3.wrong.push((await C.call('identity.emailVerify', { code: wrong })).error)
out.c3.sixthCorrect = await C.call('identity.emailVerify', { code: c3code })
out.c3.attempts = (await db.query('select attempts, "usedAt" is not null as used from "EmailCode" where "identityId" = $1 order by "createdAt" desc limit 1', [C.id])).rows[0]
await C.call('identity.emailStart', { email: c3 })
await db.query('update "EmailCode" set "expiresAt" = now() - interval \'1 second\' where "identityId" = $1 and "usedAt" is null', [C.id])
out.c3.expired = await C.call('identity.emailVerify', { code: codeOf(mails[mails.length - 1]) })
out.c3.badShape = await C.call('identity.emailVerify', { code: '12ab' })
out.c3.meStillLocal = (await C.me()).email

// ── C4 · throttle: 3 per address per hour, the 4th refused ──────────────────────────────────────────────────────────
const D = device(); await D.me()
const c4 = addr('c4')
const before4 = mails.length
out.c4 = { calls: [] }
for (let i = 0; i < 4; i++) { const r = await D.call('identity.emailStart', { email: c4 }); out.c4.calls.push(r.error ? { code: r.code, error: r.error } : 'sent') }
out.c4.stubMails = mails.length - before4
out.c4.liveCodes = await count('select count(*) as n from "EmailCode" where "identityId" = $1 and "usedAt" is null', [D.id])
out.c4.rows = await count('select count(*) as n from "EmailCode" where email = $1', [c4])
// The same address from another identity is throttled too (per address), a different address is not.
const D2 = device(); await D2.me()
out.c4.otherIdentitySameAddress = (await D2.call('identity.emailStart', { email: c4 })).error
out.c4.otherAddress = (await D2.call('identity.emailStart', { email: addr('c4b') })).data ? 'sent' : 'refused'

// ── C6 · delete identity A → EmailCode rows gone, the address free again ────────────────────────────────────────────
out.c6 = { before: { codes: await count('select count(*) as n from "EmailCode" where "identityId" = $1', [A.id]), identity: await count('select count(*) as n from "Identity" where email = $1', [shared]) } }
const step1 = await A.call('data.delete', {})
const step2 = await A.call('data.delete', { token: step1.data.token })
out.c6.delete = { step1: { devices: step1.data.devices, sightings: step1.data.sightings }, step2: step2.data }
out.c6.after = { codes: await count('select count(*) as n from "EmailCode" where "identityId" = $1', [A.id]), identity: await count('select count(*) as n from "Identity" where email = $1', [shared]) }
const E = device(); await E.me()
await E.call('identity.emailStart', { email: shared })
out.c6.reverify = (await E.call('identity.emailVerify', { code: codeOf(mails[mails.length - 1]) })).data
out.c6.meE = (await E.me()).email
// E5 · remove: address and codes gone, then `me.email` null
out.c6.remove = { r: (await E.call('identity.emailRemove', {})).data, me: (await E.me()).email, codes: await count('select count(*) as n from "EmailCode" where "identityId" = $1', [E.id]) }
out.mailsTotal = mails.length

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill(); stub.close(); await db.end()
process.exit(0)
