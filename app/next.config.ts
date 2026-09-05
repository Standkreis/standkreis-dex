import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// STATIC_EXPORT=1 builds the folder Capacitor wraps (record Q5). In that mode only .tsx routing files
// are picked up, so the tRPC route handler (route.ts) drops out and the client talks to NEXT_PUBLIC_API_URL.
const isExport = process.env.STATIC_EXPORT === '1'
// One id per build (or per `next dev` start), on the service worker URL: a new build is a new worker (handoff 0009).
// `next build` loads this file in more than one process, so the id is minted once by scripts/m8a/build-id.mjs (prebuild)
// and read here; `next dev` has no seed and mints its own.
const seed = process.env.npm_lifecycle_event?.startsWith('build') ? join(process.cwd(), 'node_modules', '.cache', 'dex-build-id') : null
const buildId = process.env.BUILD_ID ?? (seed && existsSync(seed) ? readFileSync(seed, 'utf8').trim() : Date.now().toString(36))

const nextConfig: NextConfig = {
  output: isExport ? 'export' : undefined,
  trailingSlash: isExport, // /de/ → de/index.html, so any plain file server serves it
  pageExtensions: isExport ? ['tsx'] : ['tsx', 'ts'],
  reactStrictMode: true,
  generateBuildId: () => buildId,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  // The phone on the same Wi-Fi (handoff 0009 §❓): dev assets may be requested from these hosts.
  allowedDevOrigins: ['svens-macbook-pro-2.local', '192.168.178.93', '*.local'],
  devIndicators: { position: 'top-right' }, // keep the dev badge off the bottom bar
}

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig)
