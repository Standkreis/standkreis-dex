'use client'

import { useParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { SightingRoute } from './SightingDetail'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The `/sighting/<id>` route (handoff 0008 Track B; the detail itself is `SightingDetail`, shared with the diary's drawer
 * since 0014 T1). `_` is the placeholder shell (the static export's, and the worker's answer for a sighting never opened
 * online, handoff 0012 Track 0): the router's params carry the placeholder, the URL carries the id.
 */
export function SightingPage() {
  const t = useTranslations('sighting')
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const id = params.id === '_' ? (pathname.split('/').filter(Boolean).pop() ?? '_') : params.id
  if (!UUID.test(id))
    return (
      <main className="mx-auto min-h-full max-w-[520px] px-4 pt-6 pb-24">
        <p className="text-[15px] text-ink-soft">{t('notFound')}</p>
        <Link href="/journal" className="mt-3 inline-block text-[15px] font-semibold text-moss-deep">{t('toJournal')}</Link>
      </main>
    )
  return <SightingRoute id={id} />
}
