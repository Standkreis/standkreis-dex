'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { useAtlasSet } from './AtlasCounters'
import { search } from './AtlasSearch'
import { Icon } from './Marks'
import { Thumb, tileIcon, type DexState } from './SpeciesCard'

type Species = NonNullable<ReturnType<typeof useAtlasSet>['set']>['species'][number]

/**
 * The search screen (spec §🎨 4, findings 0002 §4 L2). An empty query IS the shortlist: the set in "jetzt wahrscheinlich"
 * order with the seen species removed, eight rows. Typing: set rows first with their state (AtlasSearch), then the GBIF
 * backbone through `taxon.search`, each marked as joining the atlas (record 0002 E13).
 */
export function LogSearch() {
  const t = useTranslations('log')
  const ts = useTranslations('species')
  const tc = useTranslations('common')
  const locale = useLocale() as 'de' | 'en'
  const format = useFormatter()
  const router = useRouter()
  const trpc = useTRPC()

  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => { const h = setTimeout(() => setDebounced(q.trim()), 350); return () => clearTimeout(h) }, [q])
  const [soon, setSoon] = useState(false)

  const me = useQuery(trpc.identity.me.queryOptions())
  const region = me.data?.region ?? null
  const { set, progress, loading } = useAtlasSet(region)
  const seen = useMemo(() => new Set(progress?.seen ?? []), [progress])
  const studied = useMemo(() => new Set(progress?.studied ?? []), [progress])
  const name = useCallback((s: { names: Record<string, string>; sciName: string }) => s.names[locale] ?? s.names.de ?? s.names.en ?? s.sciName, [locale])
  const typed = q.trim().length > 0

  // The set rows: the shortlist (server order = nowRatio desc) or the folded prefix match of AtlasSearch.
  const setRows = useMemo(() => {
    if (!set) return []
    return typed ? search(set.species, q, name) : set.species.filter((s) => !seen.has(s.taxonId)).slice(0, 8)
  }, [set, typed, q, name, seen])
  const setKeys = useMemo(() => new Set(set?.species.map((s) => s.gbifKey) ?? []), [set])
  const backbone = useQuery(trpc.taxon.search.queryOptions({ q: debounced, locale }, { enabled: debounced.length >= 3, staleTime: 5 * 60_000 }))
  const backboneRows = useMemo(() => (backbone.data ?? []).filter((r) => !setKeys.has(r.gbifKey)), [backbone.data, setKeys])
  const ensure = useMutation(trpc.taxon.ensure.mutationOptions())

  const pick = (gbifKey: number) => router.push(`/log?taxon=${gbifKey}`)
  const pickBackbone = async (gbifKey: number) => { await ensure.mutateAsync({ gbifKey }); pick(gbifKey) }
  const stateOf = (s: Species): DexState => (seen.has(s.taxonId) ? 'seen' : studied.has(s.taxonId) ? 'studied' : 'none')
  const month = format.dateTime(new Date(), { month: 'long' })
  const searching = debounced.length >= 3 && (backbone.isLoading || debounced !== q.trim())
  const nothing = typed && !searching && setRows.length === 0 && backboneRows.length === 0

  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-10 [&~nav]:hidden" data-testid="log-search">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.push('/')} aria-label={t('back')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-[20px] shadow-[0_2px_12px_rgba(30,42,35,0.06)]">‹</button>
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-card pr-2 pl-4 shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
          <Icon name="search" size={20} className="shrink-0 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} autoFocus enterKeyHint="search" data-testid="log-query"
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-faint" />
          {typed && <button type="button" onClick={() => setQ('')} aria-label={t('clear')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[18px] text-ink-soft">×</button>}
        </div>
      </div>

      {/* The photo strip: attach from here in the second half of M6; for now it says so. */}
      <button type="button" onClick={() => setSoon(true)} className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-dashed border-ink-faint/60 px-4 py-3 text-left text-[15px] text-ink-soft" data-testid="log-photo-strip">
        <span aria-hidden>📷</span>
        {soon ? <span>{t('photoSoon')}</span> : <span>{t('noPhoto')} · <span className="font-semibold text-moss-deep underline">{t('addPhoto')}</span></span>}
      </button>

      {!set && loading && <p className="mt-6 text-[15px] text-ink-soft">{tc('working')}</p>}
      {me.data && !region && <p className="mt-6 text-[15px] text-ink-soft">{t('noRegion')}</p>}

      {set && (
        <>
          {(setRows.length > 0 || !typed) && (
            <section className="mt-5" data-testid="log-set">
              <h2 className="text-[13px] font-bold tracking-wide text-ink-soft uppercase">{typed ? t('inAtlas') : t('shortlist')}</h2>
              <ul className="mt-2">
                {setRows.map((s) => {
                  const state = stateOf(s)
                  return (
                    <Row key={s.taxonId} onClick={() => pick(s.gbifKey)} testId="log-row"
                      thumb={<Thumb card={{ id: s.taxonId, gbifKey: s.gbifKey, sciName: s.sciName, names: s.names, tile: s.tile, lead: s.lead?.url ?? null }} state={state} size={56} />}
                      title={name(s)} sub={<><i>{s.sciName}</i> · {ts(`tile.${s.tile}`)}{!typed && <> · {month}</>}</>}
                      right={state === 'seen' ? <span className="text-[15px] font-semibold text-moss-deep">{t('seen')}</span> : state === 'studied' ? <span className="text-[15px] font-semibold text-amber">{t('studied')}</span> : null} />
                  )
                })}
              </ul>
            </section>
          )}

          {typed && (searching || backboneRows.length > 0) && (
            <section className="mt-5" data-testid="log-backbone">
              <h2 className="text-[13px] font-bold tracking-wide text-ink-soft uppercase">{t('backbone')}</h2>
              {backboneRows.length > 0 ? (
                <ul className="mt-2">
                  {backboneRows.map((r) => (
                    <Row key={r.gbifKey} onClick={() => pickBackbone(r.gbifKey)} testId="log-backbone-row" busy={ensure.isPending}
                      thumb={<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-tile text-[24px] text-ink-faint" aria-hidden>{tileIcon[r.tile] ?? '?'}</span>}
                      title={name(r)} sub={<>{name(r) !== r.sciName && <><i>{r.sciName}</i> · </>}{ts(`tile.${r.tile}`)} · {t('joins')}</>} />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[15px] text-ink-soft">{t('searching')}</p>
              )}
            </section>
          )}

          {nothing && <p className="mt-6 text-[15px] text-ink-soft" data-testid="log-empty">{t('noResults', { q: q.trim() })}</p>}
          {!typed && <p className="mt-6 text-[13px] leading-snug text-ink-faint">{t('hint')}</p>}
        </>
      )}
    </main>
  )
}

function Row({ thumb, title, sub, right, onClick, testId, busy }: { thumb: ReactNode; title: string; sub: ReactNode; right?: ReactNode; onClick: () => void; testId: string; busy?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onClick} disabled={busy} className="flex w-full items-center gap-4 py-2.5 text-left disabled:opacity-60" data-testid={testId}>
        {thumb}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[20px] leading-tight font-bold">{title}</span>
          <span className="mt-0.5 block text-[15px] leading-snug text-ink-soft">{sub}</span>
        </span>
        {right}
      </button>
    </li>
  )
}
