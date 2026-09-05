import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AtlasGrid } from '@/components/AtlasGrid'

// Suspense: the grid reads its state from the URL (useSearchParams), which the static export renders on the client.
export default async function DexPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('dex')
  return (
    <Suspense>
      <AtlasGrid title={t('title')} />
    </Suspense>
  )
}
