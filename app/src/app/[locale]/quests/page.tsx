import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Page } from '@/components/Page'

export default async function QuestsPage({ params }: PageProps<'/[locale]/quests'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('quests')
  return <Page title={t('title')} />
}
