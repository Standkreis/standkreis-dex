// The atlas without signal (handoff 0009 Track A). Hand-written, no Workbox. Three routes:
//   navigations        network-first, 3 s timeout, then the page as last seen, then the shell of the same locale
//   /_next/static/**   cache-first (hashed in a build; a new build is a new worker and a new cache)
//   reference images   cache-first in one cache capped at 2,000 entries: the three image hosts and /api/photo/
// Everything else (tRPC, GBIF, OSM tiles, HMR) passes through untouched.
// Registered as /sw.js?v=<build id>, so every build is a new worker: the shell and static caches carry the version
// and the old ones are dropped on activate; the image cache is shared across versions and survives.

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const SHELL = `dex-shell-${VERSION}`
const STATIC = `dex-static-${VERSION}`
const IMAGES = 'dex-images'
const IMAGE_CAP = 2000
const NAV_TIMEOUT = 3000
const IMAGE_HOSTS = ['inaturalist-open-data.s3.amazonaws.com', 'thumb.wikimedia.org', 'upload.wikimedia.org']
// The shell: the client-rendered pages the walk needs, in both locales, plus `/`, which picks the locale on the client
// (the manifest's start_url). Precached with and without the trailing slash: the export has it, `next dev` has not.
const PAGES = ['/', '/de', '/en', '/de/log', '/de/journal', '/de/you', '/en/log', '/en/journal', '/en/you']
const ASSETS = ['/manifest.webmanifest', '/icon.svg']

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
})

function isImage(url, own) {
  return IMAGE_HOSTS.includes(url.hostname) || (own && url.pathname.startsWith('/api/photo/'))
}

// ── Shell ──────────────────────────────────────────────────────────────────

// Fetch every shell page once, store it under both spellings, and pull the scripts and styles it references into the
// static cache, so a page never opened online (Tagebuch on a walk) still has its chunks. One failure does not fail the install.
async function precache() {
  const shell = await caches.open(SHELL)
  const statics = await caches.open(STATIC)
  const refs = new Set()
  // One page after the other: `next dev` compiles on demand and trips over nine at once.
  for (const p of PAGES) {
    const res = await fetch(p, { redirect: 'follow', cache: 'no-cache', credentials: 'include' }).catch(() => null)
    if (!res || !res.ok) continue
    const html = await res.text()
    for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+/g)) refs.add(m[0].replace(/\\u0026/g, '&'))
    // A followed redirect (`/de/` → `/de` in dev) leaves `redirected` set, which a navigation may not be answered with.
    const plain = () => new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    await shell.put(p, plain())
    if (p !== '/') await shell.put(`${p}/`, plain())
  }
  await Promise.all(ASSETS.map((a) => fetch(a, { cache: 'no-cache' }).then((r) => (r.ok ? shell.put(a, r) : null)).catch(() => null)))
  await Promise.all([...refs].map((r) => fetch(r).then((res) => (res.ok ? statics.put(r, res) : null)).catch(() => null)))
}

async function navigate(req, url) {
  try {
    const res = await withTimeout(fetch(req), NAV_TIMEOUT)
    // Remember the page as last seen online (a visited species page), keyed without the query string.
    if (res.ok && url.origin === self.location.origin) {
      const c = await caches.open(SHELL)
      c.put(pageKey(url), res.clone()).catch(() => {})
    }
    return res
  } catch {
    const c = await caches.open(SHELL)
    return (await c.match(pageKey(url))) ?? (await shellOf(url, c)) ?? Response.error()
  }
}

const pageKey = (url) => `${url.origin}${url.pathname}`

async function shellOf(url, cache) {
  const locale = url.pathname.split('/')[1]
  const base = locale === 'de' || locale === 'en' ? `/${locale}` : '/'
  return (await cache.match(base)) ?? (await cache.match(`${base}/`)) ?? null
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
  let res = null
  if (new URL(req.url).origin !== self.location.origin) res = await fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => null)
  if (!res || !res.ok) res = await fetch(req).catch(() => null)
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
