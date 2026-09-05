import { setRequestLocale } from 'next-intl/server'
import { SpeciesPage } from '@/components/SpeciesPage'

// The species page (spec §🎨 3, handoff 0007 Track B). The shell is static; the client fetches `taxon.page` by the key in the URL.
// Static export (record Q5): every set member gets a shell file, since a static host cannot serve a path it has no file for.
// Server builds render every key on demand (dynamicParams stays true), so a species logged outside the set (taxon.ensure, E13) needs no build.

export async function generateStaticParams() {
  if (process.env.STATIC_EXPORT !== '1') return []
  const { db } = await import('@/server/db')
  const rows = await db.taxon.findMany({ where: { plausibility: { some: {} } }, select: { gbifKey: true }, orderBy: { gbifKey: 'asc' } })
  return rows.map((r) => ({ gbifKey: String(r.gbifKey) }))
}

export default async function Species({ params }: PageProps<'/[locale]/species/[gbifKey]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return <SpeciesPage />
}
