// Handoff 0006 C8: register a passkey in browser 1, authenticate in browser 2 (its own cookie jar), watch the adoption.
// Two headless Chromes over CDP with virtual authenticators; the credential is copied from authenticator 1 to 2, which
// is what a synced passkey (iCloud Keychain, Google Password Manager) does between two real devices. No dependency.
// usage: node scripts/m7/passkey-e2e.mjs [baseUrl]
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const base = process.argv[2] ?? 'http://localhost:3001'
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const here = dirname(fileURLToPath(import.meta.url))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const seed = (...args) => execFileSync('npx', ['tsx', join(here, 'seed.mts'), ...args], { cwd: join(here, '../..'), encoding: 'utf8' }).trim()

async function browser(name) {
  const port = 9300 + Math.floor(Math.random() * 500)
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-e2e-${name}-${port}`, 'about:blank'], { stdio: 'ignore' })
  let target
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200)
    target = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).then((t) => t.find((x) => x.type === 'page')).catch(() => undefined)
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
  const send = (method, params = {}) => new Promise((res, rej) => { pending.set(++id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'evaluate failed')
    return result.value
  }
  const goto = async (path) => { await send('Page.navigate', { url: base + path }); await sleep(2500) }
  const me = () => evaluate(`fetch('/api/trpc/identity.me').then(r => r.json()).then(j => j.result.data.json)`)
  const click = (sel) => evaluate(`(() => { const el = document.querySelector('${sel}'); if (!el) throw new Error('no ${sel}'); el.click(); return true })()`)
  const text = (sel) => evaluate(`document.querySelector('${sel}')?.textContent ?? null`)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('WebAuthn.enable')
  const { authenticatorId } = await send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } })
  return { name, send, evaluate, goto, me, click, text, authenticatorId, close: () => { ws.close(); proc.kill() } }
}

const log = (...a) => console.log(...a)
const A = await browser('A')
const B = await browser('B')
try {
  // Browser A: anonymous, registers a passkey.
  await A.goto('/de/settings')
  const a0 = await A.me()
  log('A anonymous id     ', a0.id, 'anonymous =', a0.anonymous)
  await A.click('[data-testid=passkey-create]')
  await sleep(2500)
  const a1 = await A.me()
  log('A after register   ', a1.id, 'anonymous =', a1.anonymous, 'devices =', a1.devices, '| card:', await A.text('[data-testid=identity-title]'))
  if (a1.anonymous) throw new Error('registration did not attach a passkey')

  // Browser B: its own anonymous identity with two pre-existing sightings and one study.
  await B.goto('/de/you')
  const b0 = await B.me()
  log('B anonymous id     ', b0.id)
  log(seed('sightings', b0.id, '2'))
  log(seed('studies', b0.id, '1'))
  log('B before           ', seed('show', b0.id))
  log('A before           ', seed('show', a1.id))

  // The passkey travels: same credential on B's authenticator (what a synced passkey does between two devices).
  const { credentials } = await A.send('WebAuthn.getCredentials', { authenticatorId: A.authenticatorId })
  for (const c of credentials) await B.send('WebAuthn.addCredential', { authenticatorId: B.authenticatorId, credential: c })
  log('credentials copied ', credentials.length, credentials.map((c) => c.credentialId.slice(0, 12)))

  // Browser B authenticates → adopts A's identity.
  await B.goto('/de/settings')
  await B.click('[data-testid=passkey-signin]')
  await sleep(3000)
  const b1 = await B.me()
  log('B after sign-in    ', b1.id, 'anonymous =', b1.anonymous, 'devices =', b1.devices, '| notice:', await B.text('[data-testid=notice]'))
  log('A after            ', seed('show', a1.id))
  log('old B identity     ', seed('show', b0.id))
  const pass = b1.id === a1.id && b0.id !== a1.id
  log(pass ? 'C8 PASS: B now carries A\'s id, B\'s rows merged, old B row gone' : 'C8 FAIL')
  console.log(JSON.stringify({ a: a1.id, bOld: b0.id, bNew: b1.id }))
} finally {
  A.close(); B.close()
}
