import { setRequestLocale } from 'next-intl/server'
import { SightingPage } from '@/components/SightingPage'

// The single sighting (spec §⚖️ ladder, handoff 0008 Track B). The shell is static; the client fetches `journal.get` by the id in the URL.
// Sightings belong to one identity, so the export cannot enumerate them: it emits one placeholder shell (`sighting/_/`) that a
// static host rewrites `/sighting/<id>/` to; server builds render every id on demand (dynamicParams stays true), like the species route.
export async function generateStaticParams() {
  return process.env.STATIC_EXPORT === '1' ? [{ id: '_' }] : []
}

export default async function Sighting({ params }: PageProps<'/[locale]/sighting/[id]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return <SightingPage />
}
