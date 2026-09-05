import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AtlasGrid } from '@/components/AtlasGrid'

export default async function DexPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('dex')
  return <AtlasGrid title={t('title')} />
}
