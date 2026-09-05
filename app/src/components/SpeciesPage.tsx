'use client'

import { Suspense, useCallback, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'next/navigation'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { Toast } from './Fill'
import { Icon, SeenMark, StudiedMark } from './Marks'
import { EcologyChip, LookalikeCard, tileIcon, type Card, type DexState } from './SpeciesCard'
import { SpeciesMap } from './SpeciesMap'
import { SpeciesSlider } from './SpeciesSlider'
import { enqueue, flush, type Lead } from './Queue'

const FACT_KEYS = ['size', 'lifespan', 'reproduction', 'migration', 'status', 'sound'] as const
const FACT_ICONS: Record<(typeof FACT_KEYS)[number], string> = { size: '📏', lifespan: '⏳', reproduction: '🥚', migration: '🧭', status: '🏷️', sound: '🎵' }
const KINDS = ['eats', 'eatenBy', 'pollinates', 'visitsFlowersOf', 'hostOf', 'parasiteOf'] as const
const CHIP_CAP = 24
// The ETL writes the year strip's words in German (record 0002 E3, schema comment); en swaps the four abbreviations that differ.
const MONTHS_EN: Record<string, string> = { Mär: 'Mar', Mai: 'May', Okt: 'Oct', Dez: 'Dec' }

/**
 * The species page (spec §🎨 3, handoff 0007 Track B): slider, three names, the two-axis state row, intro, Steckbrief,
 * Vorkommen, Verwechslungsgefahr, Ökologie, one Quellen line, the sticky "Studiert". Dex state is the client's join of
 * `identity.progress`; an empty section shows one grey line, never a heading over nothing.
 */
export function SpeciesPage() {
  const t = useTranslations('species')
  const to = useTranslations('offline')
  const tc = useTranslations('common')
  const tl = useTranslations('log')
  const locale = useLocale()
  const format = useFormatter()
  const trpc = useTRPC()
  const qc = useQueryClient()
  const router = useRouter()
  const params = useParams<{ gbifKey: string }>()
  const gbifKey = Number(params.gbifKey)

  const me = useQuery(trpc.identity.me.queryOptions())
  const region = me.data?.region ?? null
  const page = useQuery(trpc.taxon.page.queryOptions({ gbifKey, regionId: region?.id }, { enabled: Number.isInteger(gbifKey) && me.isSuccess }))
  const progress = useQuery(trpc.identity.progress.queryOptions())
  const centre = useQuery(trpc.taxon.mapCentre.queryOptions({ regionId: region?.id ?? '' }, { enabled: !!region, staleTime: Infinity }))
  const invalidate = () => qc.invalidateQueries({ queryKey: trpc.identity.progress.queryKey() })
  const [marking, setMarking] = useState(false)
  // Study marks go through the outbox (handoff 0009 B): offline the button flips at once, the flush lands the row.
  const mark = async (taxon: { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; lead: Lead }) => {
    setMarking(true)
    try {
      await enqueue({ id: crypto.randomUUID(), kind: 'study', payload: { taxonId: taxon.id, taxon } })
      qc.setQueryData(trpc.identity.progress.queryKey(), (old) => (old && !old.studied.includes(taxon.id) ? { ...old, studied: [...old.studied, taxon.id] } : old))
      void flush()
    } finally { setMarking(false) }
  }
  const unmark = useMutation(trpc.study.unmark.mutationOptions({ onSuccess: invalidate }))
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (!Number.isInteger(gbifKey) || (page.isSuccess && !page.data)) return <Empty text={t('notFound')} link={t('toAtlas')} />
  if (page.isError && !page.data) return <Empty text={to('speciesWaits')} link={t('toAtlas')} />
  if (!page.data) return <Empty text={tc('working')} />
  const s = page.data
  const studied = new Set(progress.data?.studied ?? [])
  const seen = new Set(progress.data?.seen ?? [])
  const stateOf = (id: string): DexState => (seen.has(id) ? 'seen' : studied.has(id) ? 'studied' : 'none')
  const isStudied = studied.has(s.id), isSeen = seen.has(s.id)
  const busy = marking || unmark.isPending
  // "✓ entdeckt · 5. Sep": the latest wild sighting from `identity.progress.seenAt` (findings 0007 doubt B6).
  const seenAt = progress.data?.seenAt[s.id]
  const seenLabel = isSeen && seenAt ? `${t('state.seen')} · ${format.dateTime(new Date(seenAt), { day: 'numeric', month: 'short' })}` : t('state.seen')

  // Three names: the reader's language, Latin, the other language. A missing vernacular leaves the Latin name as the title.
  const title = s.names[locale] ?? s.sciName
  const other = s.names[locale === 'de' ? 'en' : 'de']
  const sub = [title !== s.sciName ? <i key="sci">{s.sciName}</i> : null, other && other !== title ? <span key="other">{other}</span> : null].filter(Boolean)

  // Steckbrief: six cells, Status always (tile and IUCN), the rest from `facts`; the missing ones in one grey line.
  const facts = (s.facts ?? {}) as Record<string, { value: string; source: string } | undefined>
  const cells = FACT_KEYS.map((k) => {
    if (k === 'status') return { k, value: `${t(`tile.${s.tile}`)}`, sub: s.iucn ? `${s.iucn} · ${t.has(`iucn.${s.iucn}`) ? t(`iucn.${s.iucn}`) : ''}`.trim() : null }
    const f = facts[k]
    return f ? { k, value: f.value, sub: f.source } : null
  }).filter((c): c is NonNullable<typeof c> => !!c)
  const missing = FACT_KEYS.filter((k) => !cells.some((c) => c.k === k)).map((k) => t(`facts.${k}`))

  // Vorkommen: the words say what the bars cannot; the current month is dark; "jetzt gute Chancen" at ≥ 25 % of the peak (E3).
  const p = s.plausibility
  const words = p?.words ?? ''
  const headline = words === 'Ganzes Jahr' ? t('occurrence.wholeYear') : words ? t('occurrence.mainTime', { months: locale === 'en' ? words.replace(/Mär|Mai|Okt|Dez/g, (m) => MONTHS_EN[m] ?? m) : words }) : null
  const letters = t('occurrence.monthLetters').split(' ')

  const kinds = KINDS.filter((k) => s.interactions[k]?.length)
  const imageOrigins = [...new Set(s.assets.map((a) => a.origin))].map((o) => (o === 'inat' || o === 'commons' || o === 'user' ? t(`origin.${o}`) : o))
  const dataSources = ['GBIF', s.wikidataId ? 'Wikidata' : null, Object.values(facts).some((f) => f?.source === 'AnAge') ? 'AnAge' : null].filter(Boolean)
  const sources = [
    s.intro ? t('sources.text', { licence: s.intro.licence }) : null,
    t('sources.data', { list: dataSources.join(', ') }),
    p ? t('sources.occurrence') : null,
    kinds.length ? t('sources.ecology') : null,
    imageOrigins.length ? t('sources.images', { list: imageOrigins.join(', ') }) : null,
  ].filter(Boolean)

  return (
    <main className="mx-auto min-h-full max-w-[520px] pb-28 [&~nav]:hidden" data-testid="species">
      <SpeciesSlider assets={s.assets.filter((a) => a.kind === 'image')} tileIcon={tileIcon[s.tile] ?? '?'} />

      <div className="px-4">
        <h1 className={`mt-3 text-[28px] leading-tight font-bold tracking-tight ${title === s.sciName ? 'italic' : ''}`}>{title}</h1>
        {sub.length > 0 && <p className="mt-1 text-[17px] text-ink-soft">{sub.map((n, i) => <span key={i}>{i > 0 && ' · '}{n}</span>)}</p>}

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[17px]" data-testid="state">
          <span className={`flex items-center gap-2 ${isStudied ? 'font-semibold text-amber' : 'text-ink-faint'}`}>
            {isStudied ? <StudiedMark size={22} title={t('state.studied')} /> : <Grey><Icon name="book" size={13} /></Grey>}
            {isStudied ? t('state.studied') : t('state.notStudied')}
          </span>
          <span className={`flex items-center gap-2 ${isSeen ? 'font-semibold text-moss-deep' : 'text-ink-faint'}`}>
            {isSeen ? <SeenMark size={22} title={t('state.seen')} /> : <Grey><span className="h-2 w-2 rounded-full border border-current" /></Grey>}
            {isSeen ? seenLabel : t('state.notSeen')}
          </span>
        </p>

        {s.tile === 'fungus' && (
          <aside className="mt-4 rounded-2xl border border-amber/40 bg-amber-soft px-4 py-3 text-[15px] leading-snug" data-testid="fungus-notice">
            <span aria-hidden>🍄 </span><strong>{t('fungus.title')}</strong> {t('fungus.body')}
            {s.intro && <p className="mt-1.5 text-[13px] text-ink-soft">{t('fungus.intro')}</p>}
          </aside>
        )}

        {s.intro ? (
          <>
            {s.intro.lang !== locale && <p className="mt-4 text-[13px] text-ink-faint" data-testid="intro-lang">{t('introOtherLang', { lang: t.has(`lang.${s.intro.lang}`) ? t(`lang.${s.intro.lang}`) : s.intro.lang.toUpperCase() })}</p>}
            <p className={`${s.intro.lang !== locale ? 'mt-1' : 'mt-4'} text-[17px] leading-[1.45]`} lang={s.intro.lang}>{s.intro.text}</p>
          </>
        ) : (
          <p className="mt-4 text-[15px] text-ink-faint">{t('noIntro')}</p>
        )}

        <Section title={t('facts.title')} testId="facts">
          <div className="grid grid-cols-2 gap-3">
            {cells.map((c, i) => (
              <div key={c.k} className={`rounded-2xl bg-card px-4 py-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)] ${i === cells.length - 1 && cells.length % 2 ? 'col-span-2' : ''}`}>
                <div className="text-[13px] text-ink-soft"><span aria-hidden>{FACT_ICONS[c.k]} </span>{t(`facts.${c.k}`)}</div>
                <div className="mt-1 text-[17px] leading-tight font-bold">{c.value}</div>
                {c.sub && <div className="mt-1 text-[13px] text-ink-soft">{c.sub}</div>}
              </div>
            ))}
          </div>
          {missing.length > 0 && <p className="mt-3 text-[13px] text-ink-faint">{t('facts.missing', { list: missing.join(' · ') })}</p>}
        </Section>

        <Section title={t('occurrence.title')} aside={region?.name ?? null} testId="occurrence">
          {!region ? (
            <p className="text-[15px] text-ink-faint">{t('occurrence.noRegion')}</p>
          ) : !p ? (
            <p className="text-[15px] text-ink-faint" data-testid="rare">{t('occurrence.rare')}</p>
          ) : (
            <div className="rounded-3xl bg-card px-4 pt-4 pb-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)]" data-testid="year">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[17px] font-bold">{headline ?? t('empty')}</span>
                {p.now && <span className="shrink-0 text-[13px] font-semibold text-moss-deep">{t('occurrence.now')}</span>}
              </div>
              <div className="mt-3 flex h-14 items-end gap-1" aria-hidden>
                {p.monthShare.map((share, i) => {
                  const h = p.peak > 0 ? Math.max(4, Math.round((share / p.peak) * 100)) : 4
                  return <span key={i} className={`flex-1 rounded-md ${i + 1 === p.month ? 'bg-moss' : 'bg-moss-soft'}`} style={{ height: `${h}%` }} />
                })}
              </div>
              <div className="mt-1.5 flex gap-1 text-[12px] text-ink-faint" aria-hidden>
                {letters.map((l, i) => <span key={i} className={`flex-1 text-center ${i + 1 === p.month ? 'font-bold text-moss-deep' : ''}`}>{l}</span>)}
              </div>
              <p className="mt-2 text-[12px] text-ink-faint">{t('occurrence.reports', { n: p.obs.toLocaleString(locale) })}</p>
            </div>
          )}
          {/* No map for an out-of-set taxon: the set is the ETL's call, and a dense GBIF map under "hier selten gemeldet" would argue with it. */}
          {region && p && centre.data && <SpeciesMap centre={centre.data} taxonKey={s.gbifKey} region={region.name} />}
        </Section>

        <Section title={t('lookalikes.title')} testId="lookalikes">
          {s.lookalikes.length ? (
            <Row>{s.lookalikes.map((c: Card) => <LookalikeCard key={c.id} card={c} state={stateOf(c.id)} />)}</Row>
          ) : (
            <p className="text-[15px] text-ink-faint">{t('lookalikes.empty')}</p>
          )}
        </Section>

        <Section title={t('ecology.title')} testId="ecology">
          {kinds.length ? (
            kinds.map((k) => {
              const all = s.interactions[k]!
              const shown = expanded[k] ? all : all.slice(0, CHIP_CAP)
              return (
                <div key={k} className="mt-3 first:mt-0">
                  <h3 className="text-[15px] font-semibold text-ink-soft">{t(`ecology.kind.${k}`)}</h3>
                  <Row className="mt-2">
                    {shown.map((c) => <EcologyChip key={c.id} card={c} state={stateOf(c.id)} inSet={c.inSet} />)}
                    {all.length > shown.length && (
                      <button type="button" onClick={() => setExpanded((e) => ({ ...e, [k]: true }))} className="shrink-0 rounded-2xl bg-tile px-3 py-2 text-[15px] font-semibold text-ink-soft">
                        {t('ecology.more', { n: all.length - shown.length })}
                      </button>
                    )}
                  </Row>
                </div>
              )
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-ink-faint/40 px-4 py-3 text-[15px] text-ink-soft">{t('ecology.empty', { name: title })}</p>
          )}
        </Section>

        <p className="mt-8 text-[13px] leading-snug text-ink-faint" data-testid="sources">
          <span className="font-semibold">{t('sources.label')}</span> · {sources.join(' · ')}
        </p>
      </div>

      {/* The sticky bar (spec §🎨 3): "Entdeckt" opens the save screen with the species preset (handoff 0008 Track A); "Studiert" toggles. The tab bar (a later sibling of main) is hidden on this page, as in the mock. */}
      <div className="fixed inset-x-0 z-10" style={{ bottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-[520px] gap-3 bg-gradient-to-t from-paper via-paper/95 to-paper/0 px-4 pt-6 pb-2">
          <button type="button" disabled={!progress.data} data-testid="log"
            onClick={() => router.push(`/log?taxon=${s.gbifKey}&from=species`)}
            className="flex h-13 flex-[1.3] items-center justify-center gap-2 rounded-full bg-moss text-[17px] font-bold text-white shadow-md disabled:opacity-60">
            <span aria-hidden>👁</span> {isSeen ? tl('logAgain') : tl('logFirst')}
          </button>
          <button type="button" disabled={busy || !progress.data} aria-pressed={isStudied} data-testid="study"
            onClick={() => (isStudied ? unmark.mutate({ taxonId: s.id }) : void mark({ id: s.id, gbifKey: s.gbifKey, sciName: s.sciName, names: s.names, tile: s.tile, lead: s.assets[0] ? { url: s.assets[0].url, author: s.assets[0].author, licence: s.assets[0].licence, licenceUrl: s.assets[0].licenceUrl, sourceUrl: s.assets[0].sourceUrl, origin: s.assets[0].origin } : null }))}
            className={`flex h-13 flex-1 items-center justify-center gap-2 rounded-full text-[17px] font-bold shadow-md transition-colors disabled:opacity-60 ${isStudied ? 'bg-amber-soft text-amber' : 'bg-amber text-white'}`}>
            <Icon name="book" size={20} /> {isStudied ? t('study.marked') : t('study.mark')}
          </button>
        </div>
      </div>
      <Suspense><AgainToast name={title} /></Suspense>
    </main>
  )
}

/** The quiet toast after a repeat sighting logged from this page (`?again=<id>`, doubt 12); the param goes with the toast. */
function AgainToast({ name }: { name: string }) {
  const tf = useTranslations('fill')
  const params = useSearchParams()
  const again = params.get('again')
  const kept = params.get('kept') === '1'
  const done = useCallback(() => window.history.replaceState(null, '', window.location.pathname), [])
  if (!again) return null
  return <Toast key={again} text={tf(kept ? 'kept' : 'again', { name })} onDone={done} />
}

const Grey = ({ children }: { children: ReactNode }) => <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-tile text-ink-faint">{children}</span>

function Section({ title, aside, testId, children }: { title: string; aside?: string | null; testId: string; children: ReactNode }) {
  return (
    <section className="mt-8" data-testid={testId}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[22px] leading-tight font-bold tracking-tight">{title}</h2>
        {aside && <span className="shrink truncate text-[13px] text-ink-faint">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

/** A horizontally scrolling row that bleeds to the screen edges. */
const Row = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>{children}</div>
)

function Empty({ text, link }: { text: string; link?: string }) {
  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-6 pb-24">
      <p className="text-[15px] text-ink-soft">{text}</p>
      {link && <Link href="/" className="mt-3 inline-block text-[15px] font-semibold text-moss-deep">{link}</Link>}
    </main>
  )
}
