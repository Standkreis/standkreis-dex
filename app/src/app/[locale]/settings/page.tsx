import { setRequestLocale } from 'next-intl/server'
import { IdentitySettings } from '@/components/IdentitySettings'
import pkg from '../../../../package.json'

export default async function SettingsPage({ params }: PageProps<'/[locale]/settings'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return <IdentitySettings version={pkg.version} />
}
