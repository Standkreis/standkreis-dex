'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Tile } from '@/generated/prisma/enums'
import { useTRPC } from '@/trpc/client'

const allTiles = Object.values(Tile) as Tile[]

export type SetCounters =
  | { state: 'preparing' }
  | { state: 'ready'; studied: number; seen: number; possible: number }

// The three counters over the whole-year set (findings 0002 §10, doubt 41: the profile counts the year).
// Reads `dex.set` for the filter's tiles (empty = all eight) once the region is ready; before that, "wird vorbereitet".
export function useSetCounters(region: { id: string; status: string } | null): SetCounters {
  const trpc = useTRPC()
  const ready = region?.status === 'ready'
  const progress = useQuery(trpc.identity.progress.queryOptions(undefined, { enabled: ready }))
  const tiles = progress.data?.tiles.length ? progress.data.tiles : allTiles
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region?.id ?? '', tiles, nowOnly: false }, { enabled: ready && !!progress.data }))
  if (!ready || !progress.data || !set.data) return { state: 'preparing' }
  const inSet = new Set(set.data.species.map((s) => s.taxonId))
  const count = (ids: string[]) => ids.filter((id) => inSet.has(id)).length
  return { state: 'ready', studied: count(progress.data.studied), seen: count(progress.data.seen), possible: inSet.size }
}

export function CountersCard({ regionName, counters }: { regionName: string | null; counters: SetCounters }) {
  const t = useTranslations('you')
  const ready = counters.state === 'ready'
  const possible = ready ? Math.max(counters.possible, 1) : 1
  const pct = (n: number) => `${Math.min(100, Math.round((n / possible) * 100))}%`
  return (
    <section className="rounded-3xl bg-card px-4 py-4 shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
      <div className="text-[13px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
        {regionName ?? t('noRegion')} · {t('wholeYear')}
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-tile" aria-hidden>
        {ready && (
          <>
            <span className="h-full bg-amber" style={{ width: pct(counters.studied) }} />
            <span className="h-full bg-moss" style={{ width: pct(counters.seen) }} />
          </>
        )}
      </div>
      <p className="mt-3 text-[17px]" data-testid="counters">
        {ready ? (
          <>
            <span className="font-bold text-amber">{t('studied', { n: counters.studied })}</span>
            <span className="text-ink-soft"> · </span>
            <span className="font-bold text-moss-deep">{t('seen', { n: counters.seen })}</span>
            <span className="text-ink-soft"> · {t('possible', { n: counters.possible })}</span>
          </>
        ) : (
          <span className="text-ink-soft">{t('preparing')}</span>
        )}
      </p>
    </section>
  )
}
