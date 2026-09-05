// The worker's precache list (handoff 0009 Track A). Runs after every build (`postbuild`, `postbuild:export`): every
// client file under .next/static (chunks, css, media), written as JSON next to the build's own files at
// /_next/static/<build id>/sw-manifest.json, so the worker registered as /sw.js?v=<build id> knows where to find it.
// The shell HTML references only the chunks of the first paint; the ones React loads on demand (a client component of
// a page opened later, a tab never visited online) live only here. Without them the cached page is a dead shell.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('../../', import.meta.url).pathname
const next = join(root, '.next')
const buildId = readFileSync(join(next, 'BUILD_ID'), 'utf8').trim()
const staticDir = join(next, 'static')

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p] })
const files = walk(staticDir)
  .map((p) => `/_next/static/${relative(staticDir, p)}`)
  .filter((p) => /\.(js|css|woff2?)$/.test(p) && !/\/(_buildManifest|_ssgManifest|_clientMiddlewareManifest)\.js$/.test(p))
  .sort()
const manifest = { buildId, files }

// `next start` serves .next/static; the export serves out/_next/static, copied before this runs (an `out/` of an
// older build has another id under it and is left alone).
const targets = [join(staticDir, buildId), join(root, 'out', '_next', 'static', buildId)].filter((d) => existsSync(d))
for (const dir of targets) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'sw-manifest.json'), JSON.stringify(manifest))
}
const bytes = files.reduce((n, p) => n + statSync(join(staticDir, p.slice('/_next/static/'.length))).size, 0)
console.log(`sw-manifest ${buildId}: ${files.length} files, ${(bytes / 1024).toFixed(0)} KB → ${targets.map((t) => relative(root, t)).join(', ')}`)
