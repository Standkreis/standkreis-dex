import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Journal } from '@/components/Journal'

// The Tagebuch (spec §🎨 8, handoff 0008 Track B). The shell is static; the client fetches `journal.days`.
// Suspense: the pill lives in the URL (useSearchParams), which the static export renders on the client.
export default async function JournalPage({ params }: PageProps<'/[locale]/journal'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('journal')
  return (
    <Suspense>
      <Journal title={t('title')} />
    </Suspense>
  )
}
