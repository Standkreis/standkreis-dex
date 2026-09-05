'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { Icon } from './Marks'
import { CountersCard, useSetCounters } from './IdentityCounters'
import { OfflineDownload } from './OfflineDownload'

export const initialsOf = (name: string | null | undefined) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

// Du, the plain variant (handoff 0006: the profile card without XP; M11 owns XP). Name and initials, region, the three counters, gear.
export function IdentityProfile() {
  const t = useTranslations('you')
  const trpc = useTRPC()
  const qc = useQueryClient()
  const me = useQuery(trpc.identity.me.queryOptions())
  const setName = useMutation(trpc.identity.setName.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: trpc.identity.me.queryKey() }) }))
  const [editing, setEditing] = useState<string | null>(null)
  const counters = useSetCounters(me.data?.region ?? null)
  const name = me.data?.displayName ?? null
  const initials = initialsOf(name)

  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-24">
      <div className="flex h-10 items-center justify-between">
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{t('title')}</h1>
        <Link href="/settings" aria-label={t('settings')} className="flex h-9 w-9 items-center justify-center rounded-full bg-tile text-ink-soft">
          <Icon name="gear" size={20} />
        </Link>
      </div>

      <section className="mt-4 flex items-center gap-4 rounded-3xl bg-card px-4 py-4 shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-moss-soft text-[22px] font-bold text-moss-deep" aria-hidden>
          {initials || <Icon name="you" size={28} />}
        </div>
        <div className="min-w-0 flex-1">
          {editing === null ? (
            <>
              <div className="flex items-baseline gap-2">
                <h2 className={`truncate text-[22px] leading-tight font-bold ${name ? '' : 'text-ink-soft'}`} data-testid="display-name">{name ?? t('noName')}</h2>
                <button type="button" onClick={() => setEditing(name ?? '')} className="shrink-0 text-[13px] font-semibold text-moss-deep">{t('edit')}</button>
              </div>
              <div className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-ink-faint uppercase">{me.data?.region?.name ?? t('noRegion')}</div>
            </>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setName.mutate({ displayName: editing }); setEditing(null) }}
              className="flex flex-col gap-2"
            >
              <input autoFocus value={editing} maxLength={40} placeholder={t('namePlaceholder')} onChange={(e) => setEditing(e.target.value)} className="w-full rounded-xl bg-paper px-3 py-2 text-[17px] outline-none ring-1 ring-tile focus:ring-moss" />
              <p className="text-[12px] text-ink-soft">{t('nameHint')}</p>
              <div className="flex gap-3 text-[13px] font-semibold">
                <button type="submit" className="rounded-full bg-moss px-3 py-1 text-white">{t('save')}</button>
                <button type="button" onClick={() => setEditing(null)} className="text-ink-soft">{t('cancel')}</button>
              </div>
            </form>
          )}
        </div>
      </section>

      <div className="mt-4">
        <CountersCard regionName={me.data?.region?.name ?? null} counters={counters} />
      </div>
      <div className="mt-4"><OfflineDownload /></div>
    </main>
  )
}
