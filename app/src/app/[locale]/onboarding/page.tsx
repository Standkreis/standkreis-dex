import { Suspense } from 'react'
import type { Viewport } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Onboarding } from '@/components/Onboarding'

// Handoff 0013 O4: the splash's bottom colour as theme-color on this route only, so Safari's bar blends with the page
// bottom (the layout's paper/dark pair stays everywhere else). The value is --color-night-deep in tokens.css.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#080803',
}

// Suspense: "?change=1" (the drawer's Ändern) is read from the URL on the client.
export default async function OnboardingPage({ params }: PageProps<'/[locale]/onboarding'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  )
}
