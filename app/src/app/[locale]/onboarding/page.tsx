import { setRequestLocale } from 'next-intl/server'
import { Onboarding } from '@/components/Onboarding'

export default async function OnboardingPage({ params }: PageProps<'/[locale]/onboarding'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return <Onboarding />
}
