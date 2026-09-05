import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Shell } from '@/components/Shell'
import { ServiceWorker } from '@/components/ServiceWorker'
import { IdentityBoot } from '@/components/IdentityBoot'
import { TRPCReactProvider } from '@/trpc/client'
import Script from 'next/script'
import { ThemeBoot, themeScript } from '@/components/Appearance'
import '../globals.css'

// No `dynamicParams = false` here: Next applies it to every route below the segment (its own TODO in
// build/static-paths/app.js), so a server build answered every species and sighting page with 404 (found in
// handoff 0009 Track A on the production build). Unknown locales still end in notFound() below.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'app' })
  return {
    title: t('name'),
    description: t('description'),
    manifest: '/manifest.webmanifest',
    icons: { icon: '/icon.svg', apple: '/icon.svg' },
    appleWebApp: { capable: true, title: t('name'), statusBarStyle: 'default' },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f2ea' },
    { media: '(prefers-color-scheme: dark)', color: '#121b16' },
  ],
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Darstellung: applies a stored light/dark choice before paint; the default follows the system. */}
        <Script id="dex-theme" strategy="beforeInteractive">{themeScript}</Script>
      </head>
      <body className="font-sans">
        <NextIntlClientProvider>
          <TRPCReactProvider>
            {children}
            <Shell />
            <IdentityBoot />
            <ThemeBoot />
            <ServiceWorker />
          </TRPCReactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
