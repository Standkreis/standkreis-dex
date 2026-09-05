'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { useDayLabel } from './JournalDate'
import { Thumb, useName, type DexState } from './SpeciesCard'

const KINDS = ['all', 'studied', 'seen'] as const
type Kind = (typeof KINDS)[number]
type Row = { id: string; kind: 'sighting' | 'study'; at: Date; taxon: { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; lead: string | null }; place: string | null; photo: string | null; note: string | null; wildness: 'wild' | 'captive' | 'cultivated' | null; first: boolean }

/**
 * The Tagebuch (spec §🎨 8, findings 0002 §8 T1, handoff 0008 Track B): one card per day, newest first, the day's places
 * on the right, rows with a mini tile, the name, one chip and the meta line. Pills Alle · Studiert · Entdeckt (order rule:
 * amber before green). Studies are rows too. Infinite scroll by day, 30 days per page. The pill lives in the URL so back restores it.
 */
export function Journal({ title }: { title: string }) {
  const t = useTranslations('journal')
  const tc = useTranslations('common')
  const trpc = useTRPC()
  const params = useSearchParams()
  const kind: Kind = (KINDS as readonly string[]).includes(params.get('kind') ?? '') ? (params.get('kind') as Kind) : 'all'
  const setKind = useCallback((k: Kind) => {
    const next = new URLSearchParams(window.location.search)
    if (k === 'all') next.delete('kind'); else next.set('kind', k)
    const qs = next.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [])
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const progress = useQuery(trpc.identity.progress.queryOptions())
  const days = useInfiniteQuery(trpc.journal.days.infiniteQueryOptions({ kind, tz }, { getNextPageParam: (last) => last.nextBefore ?? undefined, initialCursor: null }))
  const studied = useMemo(() => new Set(progress.data?.studied ?? []), [progress.data])
  const seen = useMemo(() => new Set(progress.data?.seen ?? []), [progress.data])
  const stateOf = (id: string): DexState => (seen.has(id) ? 'seen' : studied.has(id) ? 'studied' : 'none')

  // Older days load when the sentinel scrolls into view; the button under it does the same for keyboards and screen readers.
  const sentinel = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = days
  useEffect(() => {
    if (!sentinel.current || !hasNextPage) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !isFetchingNextPage) fetchNextPage() }, { rootMargin: '400px' })
    io.observe(sentinel.current)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const all = days.data?.pages.flatMap((p) => p.days) ?? []
  const nothingAtAll = days.isSuccess && kind === 'all' && all.length === 0

  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-24">
      <div className="flex h-10 items-center">
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{title}</h1>
      </div>

      {nothingAtAll ? (
        <p className="mt-3 text-[15px] text-ink-soft" data-testid="empty">{t('empty')}</p>
      ) : (
        <>
          <div className="mt-3 flex gap-2" role="tablist" data-testid="pills">
            {KINDS.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} data-testid={`pill-${k}`}
                className={`rounded-full px-4 py-2 text-[15px] font-semibold ${kind === k ? 'bg-moss-soft text-moss-deep ring-1 ring-moss' : 'bg-tile text-ink-soft'}`}>
                {t(k)}
              </button>
            ))}
          </div>

          {days.isSuccess && all.length === 0 && <p className="mt-6 text-center text-[15px] text-ink-soft" data-testid="empty">{t('emptyFilter')}</p>}

          {all.map((day) => <DayCard key={day.day} day={day.day} places={day.places} rows={day.rows} stateOf={stateOf} />)}

          <div ref={sentinel} />
          {hasNextPage && (
            <button type="button" disabled={isFetchingNextPage} onClick={() => fetchNextPage()} data-testid="more" className="mt-4 w-full rounded-2xl bg-tile px-4 py-3 text-[15px] font-semibold text-ink-soft disabled:opacity-60">
              {isFetchingNextPage ? tc('working') : t('more')}
            </button>
          )}
          {days.isLoading && <p className="mt-3 text-[15px] text-ink-soft">{tc('working')}</p>}
          {days.isError && <p className="mt-3 text-[15px] text-amber">{tc('error')}</p>}
          {all.length > 0 && <p className="mt-5 text-[12px] text-ink-faint">{t('footer')}</p>}
        </>
      )}
    </main>
  )
}

function DayCard({ day, places, rows, stateOf }: { day: string; places: string[]; rows: Row[]; stateOf: (id: string) => DexState }) {
  const { label } = useDayLabel()
  return (
    <section className="mt-5" data-testid="day" data-day={day}>
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 className="shrink-0 text-[17px] leading-tight font-bold whitespace-nowrap" data-testid="day-label">{label(day)}</h2>
        {places.length > 0 && <span className="min-w-0 truncate text-[13px] text-ink-faint" data-testid="day-places">{places.join(', ')}</span>}
      </div>
      <ul className="rounded-3xl bg-card px-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
        {rows.map((r) => <JournalRow key={r.id} row={r} state={stateOf(r.taxon.id)} />)}
      </ul>
    </section>
  )
}

/** One row: mini tile without badges (the image tells the state), name, one chip or none, `time · Gemeinde · gehalten · 📷 · note`. */
export function JournalRow({ row, state }: { row: Row; state: DexState }) {
  const t = useTranslations('journal')
  const format = useFormatter()
  const name = useName()
  const chip = row.kind === 'study' ? { text: t('studiedChip'), cls: 'bg-amber-soft text-amber' } : row.first ? { text: t('newlySeen'), cls: 'bg-moss-soft text-moss-deep' } : null
  const meta: React.ReactNode[] = [format.dateTime(row.at, { hour: '2-digit', minute: '2-digit' })]
  if (row.place) meta.push(row.place)
  if (row.wildness && row.wildness !== 'wild') meta.push(t(row.wildness))
  if (row.photo) meta.push(<span key="photo" aria-label={t('withPhoto')} role="img">📷</span>)
  if (row.note) meta.push(<i key="note">{row.note}</i>)
  const inner = (
    <>
      <Thumb card={{ ...row.taxon, lead: row.photo ?? row.taxon.lead }} state={state} size={56} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[17px] leading-tight font-semibold">{name(row.taxon)}</span>
          {chip && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${chip.cls}`} data-testid="chip">{chip.text}</span>}
        </span>
        <span className="mt-1 block truncate text-[14px] text-ink-soft" data-testid="meta">
          {meta.map((m, i) => <span key={i}>{i > 0 && ' · '}{m}</span>)}
        </span>
      </span>
    </>
  )
  const cls = 'flex items-center gap-3 py-2.5'
  return (
    <li className="border-b border-tile last:border-b-0" data-testid="row" data-kind={row.kind}>
      {row.kind === 'sighting' ? <Link href={`/sighting/${row.id}`} className={cls}>{inner}</Link> : <Link href={`/species/${row.taxon.gbifKey}`} className={cls}>{inner}</Link>}
    </li>
  )
}
