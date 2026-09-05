import { Suspense } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { LogFlow } from '@/components/LogFlow'

// Log a sighting (spec §🎨 4): `/log` is the search (empty query = the shortlist), `/log?taxon=<gbifKey>` the save screen.
// Suspense: the step lives in the URL (useSearchParams), rendered on the client in the static export.
export default async function LogPage({ params }: PageProps<'/[locale]/log'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Suspense>
      <LogFlow />
    </Suspense>
  )
}
