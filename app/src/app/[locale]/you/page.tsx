import { setRequestLocale } from 'next-intl/server'
import { IdentityProfile } from '@/components/IdentityProfile'

export default async function YouPage({ params }: PageProps<'/[locale]/you'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return <IdentityProfile />
}
