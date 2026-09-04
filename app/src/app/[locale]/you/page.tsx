import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Page } from '@/components/Page'

export default async function YouPage({ params }: PageProps<'/[locale]/you'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('you')
  return <Page title={t('title')} />
}
