import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Page } from '@/components/Page'

export default async function JournalPage({ params }: PageProps<'/[locale]/journal'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('journal')
  return <Page title={t('title')} />
}
