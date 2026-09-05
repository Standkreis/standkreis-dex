import { Suspense } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { Onboarding } from '@/components/Onboarding'

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
