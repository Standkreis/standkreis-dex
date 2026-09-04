import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Page } from '@/components/Page'

export default async function DexPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('dex')
  return <Page title={t('title')} />
}
