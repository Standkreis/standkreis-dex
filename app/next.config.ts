import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// STATIC_EXPORT=1 builds the folder Capacitor wraps (record Q5). In that mode only .tsx routing files
// are picked up, so the tRPC route handler (route.ts) drops out and the client talks to NEXT_PUBLIC_API_URL.
const isExport = process.env.STATIC_EXPORT === '1'

const nextConfig: NextConfig = {
  output: isExport ? 'export' : undefined,
  trailingSlash: isExport, // /de/ → de/index.html, so any plain file server serves it
  pageExtensions: isExport ? ['tsx'] : ['tsx', 'ts'],
  reactStrictMode: true,
  // The phone on the same Wi-Fi (handoff 0009 §❓): dev assets may be requested from these hosts.
  allowedDevOrigins: ['svens-macbook-pro-2.local', '192.168.178.93', '*.local'],
  devIndicators: { position: 'top-right' }, // keep the dev badge off the bottom bar
}

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig)
