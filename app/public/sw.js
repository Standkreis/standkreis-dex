// The atlas without signal (handoff 0009 Track A). Hand-written, no Workbox. Three routes:
//   navigations        network-first, 3 s timeout; offline: the page under its own path, then (species) the "wartet
//                      aufs Netz" page, then the shell of the same locale
//   /_next/static/**   cache-first (hashed in a build; a new build is a new worker and a new cache)
//   reference images   cache-first in one cache capped at 2,000 entries: the three image hosts and /api/photo/
// Everything else (tRPC, RSC payloads, GBIF, OSM tiles, HMR) passes through untouched. An RSC payload that fails offline
// makes the Next router fall back to a full navigation, which the first route answers from cache.
// Registered as /sw.js?v=<build id>, so every build is a new worker: the shell and static caches carry the version
// and the old ones are dropped on activate; the image cache is shared across versions and survives.

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const SHELL = `dex-shell-${VERSION}`
const STATIC = `dex-static-${VERSION}`
const IMAGES = 'dex-images'
const IMAGE_CAP = 2000
const PAGE_CAP = 300 // visited pages kept beyond the precached ones (species, sightings)
const NAV_TIMEOUT = 3000
const IMAGE_HOSTS = ['inaturalist-open-data.s3.amazonaws.com', 'thumb.wikimedia.org', 'upload.wikimedia.org']
// The shell: the client-rendered pages the walk needs, in both locales, plus `/`, which picks the locale on the client
// (the manifest's start_url). Precached with and without the trailing slash: the export has it, `next dev` has not.
const PAGES = ['/', '/de', '/en', '/de/log', '/de/journal', '/de/you', '/en/log', '/en/journal', '/en/you']
const ASSETS = ['/manifest.webmanifest', '/icon.svg']
// Every client file of this build, written by scripts/m8a/sw-manifest.mjs after `next build`. Missing in `next dev`.
const MANIFEST = `/_next/static/${VERSION}/sw-manifest.json`

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('dex-shell-') || k.startsWith('dex-static-')) && k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const own = url.origin === self.location.origin
  if (req.mode === 'navigate') event.respondWith(navigate(req, url))
  else if (own && url.pathname.startsWith('/_next/static/')) event.respondWith(cacheFirst(STATIC, req))
  else if (isImage(url, own)) event.respondWith(image(req))
  else if (own && ASSETS.includes(url.pathname)) event.respondWith(cacheFirst(SHELL, req))
  // A client-side navigation (Link) fetches the RSC payload, never the HTML: remember the HTML too, so the page
  // survives a reload without network. Prefetches (every Link in view) are not visits.
  else if (own && req.headers.get('RSC') === '1' && !req.headers.get('Next-Router-Prefetch') && isPagePath(url.pathname)) event.waitUntil(rememberPage(url))
})

const isImage = (url, own) => IMAGE_HOSTS.includes(url.hostname) || (own && url.pathname.startsWith('/api/photo/'))
const isPagePath = (p) => !p.startsWith('/_next/') && !p.startsWith('/api/') && !p.includes('.')
const pageKey = (url) => `${url.origin}${url.pathname}`

// ── Shell ──────────────────────────────────────────────────────────────────

// Every client file of the build (the manifest), then every shell page under both spellings. The HTML's own script tags
// are pulled too, in case the manifest is missing (`next dev`). One failure does not fail the install.
async function precache() {
  const shell = await caches.open(SHELL)
  const statics = await caches.open(STATIC)
  const refs = new Set()
  const manifest = await fetch(MANIFEST, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
  for (const f of manifest?.files ?? []) refs.add(f)
  // One page after the other: `next dev` compiles on demand and trips over nine at once.
  for (const p of PAGES) {
    const res = await fetch(p, { redirect: 'follow', cache: 'no-cache', credentials: 'include' }).catch(() => null)
    if (!res || !res.ok) continue
    const html = await res.text()
    for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+/g)) refs.add(m[0].replace(/\\u0026/g, '&'))
    await putPage(shell, p, html)
    if (p !== '/') await putPage(shell, `${p}/`, html)
  }
  await Promise.all(ASSETS.map((a) => fetch(a, { cache: 'no-cache' }).then((r) => (r.ok ? shell.put(a, r) : null)).catch(() => null)))
  // Chunks in batches of 8: Safari drops parallel fetches from an installing worker when there are too many.
  const list = [...refs]
  for (let i = 0; i < list.length; i += 8) {
    await Promise.all(list.slice(i, i + 8).map((r) => statics.match(r).then((hit) => hit ? null : fetch(r).then((res) => (res.ok ? statics.put(r, res) : null))).catch(() => null)))
  }
}

// A followed redirect (`/de/` → `/de` in dev) leaves `redirected` set, which a navigation may not be answered with:
// pages are stored as plain responses.
const putPage = (cache, key, html) => cache.put(key, new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }))

async function navigate(req, url) {
  try {
    const res = await withTimeout(fetch(req), NAV_TIMEOUT)
    // Remember the page as last seen online (a visited species page), keyed without the query string.
    if (res.ok && url.origin === self.location.origin && isPagePath(url.pathname)) {
      const c = await caches.open(SHELL)
      c.put(pageKey(url), res.clone()).then(() => trimPages(c)).catch(() => {})
    }
    return res
  } catch {
    const c = await caches.open(SHELL)
    return (await c.match(pageKey(url))) ?? (await c.match(`${pageKey(url)}/`)) ?? speciesWaits(url) ?? (await shellOf(url, c)) ?? Response.error()
  }
}

async function rememberPage(url) {
  const c = await caches.open(SHELL)
  if (await c.match(pageKey(url))) return
  const res = await fetch(url.pathname, { credentials: 'include', headers: { accept: 'text/html' } }).catch(() => null)
  if (!res || !res.ok) return
  await putPage(c, pageKey(url), await res.text())
  await trimPages(c)
}

// Visited pages beyond the cap go, oldest first; the precached shell pages and assets stay whatever their age.
async function trimPages(c) {
  const fixed = new Set([...PAGES, ...PAGES.map((p) => `${p}/`), ...ASSETS].map((p) => `${self.location.origin}${p}`))
  const keys = (await c.keys()).filter((k) => !fixed.has(k.url))
  if (keys.length <= PAGE_CAP) return
  await Promise.all(keys.slice(0, keys.length - PAGE_CAP).map((k) => c.delete(k)))
}

async function shellOf(url, cache) {
  const locale = url.pathname.split('/')[1]
  const base = locale === 'de' || locale === 'en' ? `/${locale}` : '/'
  return (await cache.match(base)) ?? (await cache.match(`${base}/`)) ?? null
}

// A species page never opened online (C3): an honest line in the app's colours, not the atlas under the wrong URL.
// The strings mirror `offline.speciesWaits`, `offline.speciesHint` and `species.toAtlas` in the locale JSONs; a worker
// cannot read them. Colours from styles/tokens.css: paper, ink, moss-deep, both schemes.
const WAITS = {
  de: { title: 'Diese Art wartet aufs Netz', hint: 'Einmal mit Netz öffnen, dann bleibt sie auf dem Handy.', back: 'Zum Atlas' },
  en: { title: 'This species is waiting for a signal', hint: 'Open it once with a signal, then it stays on your phone.', back: 'To the atlas' },
}
function speciesWaits(url) {
  const [, locale, kind] = url.pathname.split('/')
  const s = WAITS[locale]
  if (!s || kind !== 'species') return null
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${s.title}</title>
<style>:root{color-scheme:light dark}body{margin:0;font-family:-apple-system,system-ui,sans-serif;background:#f5f2ea;color:#1e2a23;-webkit-font-smoothing:antialiased}
main{max-width:520px;margin:0 auto;padding:max(24px,env(safe-area-inset-top)) 16px 96px}h1{font-size:22px;line-height:1.25;margin:0}p{font-size:15px;line-height:1.45;color:#5b675f;margin:12px 0 0}
a{display:inline-block;margin-top:16px;font-size:15px;font-weight:600;color:#15803d;text-decoration:none}
@media(prefers-color-scheme:dark){body{background:#121b16;color:#e9eee8}p{color:#a3aea6}a{color:#4ade80}}</style></head>
<body data-testid="species-waits"><main><h1>📴 ${s.title}</h1><p>${s.hint}</p><a href="/${locale}">${s.back}</a></main></body></html>`
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

// ── Static ─────────────────────────────────────────────────────────────────

async function cacheFirst(name, req) {
  const c = await caches.open(name)
  const hit = await c.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) c.put(req, res.clone()).catch(() => {})
  return res
}

// ── Images ─────────────────────────────────────────────────────────────────

// Keyed by URL. Fetched in CORS mode first (all three hosts allow it): a CORS response is stored at its real size,
// whereas Chrome pads an opaque one to several MB in the quota, which would empty the 14 MB budget after a few cells.
let puts = 0
async function image(req) {
  const c = await caches.open(IMAGES)
  const hit = await c.match(req.url)
  if (hit) return hit
  // A CORS answer of any status is the answer (a 429 stays a 429, not an opaque copy nobody can read); only a host
  // that refuses CORS altogether is fetched as the page asked, and its opaque response is cached as it is.
  let res = null
  if (new URL(req.url).origin !== self.location.origin) res = await fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => null)
  if (!res) res = await fetch(req).catch(() => null)
  if (!res) return Response.error()
  if (res.ok || res.type === 'opaque') {
    await c.put(req.url, res.clone()).catch(() => {})
    if (++puts % 25 === 0) trim(c).catch(() => {})
  }
  return res
}

// Insertion order is the Cache API's key order: drop the oldest beyond the cap.
async function trim(c) {
  const keys = await c.keys()
  if (keys.length <= IMAGE_CAP) return
  await Promise.all(keys.slice(0, keys.length - IMAGE_CAP).map((k) => c.delete(k)))
}
