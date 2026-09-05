'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Tile } from '@/generated/prisma/enums'
import { useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { Icon } from './Marks'
import { OnboardingSilhouette } from './OnboardingSilhouette'

// Spec §🎨 1: three screens, one action each. Region (location explained before the OS prompt, "Ort eingeben" as the
// fallback), groups as tiles all on, a ready screen with this month's count and nine grey cells. No skip, no account.
// Rendered over the shell (z-30) so the bottom bar stays out of the first minute.

// The splash photo, chosen once (handoff 0007 §❓): a Mainz-Bingen set member with a CC BY photo. Owner's pick pending;
// the two alternatives shown were Kleiber (Frank Vassen, CC BY 4.0) and Amsel (Luiz Lapa, CC BY 4.0).
const SPLASH = {
  url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/242668015/large.jpg',
  author: 'Andrea Poggi',
  licence: 'CC BY 4.0',
  source: 'iNaturalist',
  sourceUrl: 'https://www.inaturalist.org/photos/242668015',
  position: '72% 40%',
}

const allTiles = Object.values(Tile) as Tile[]
// The tiles screen's order: the big groups first, as findings 0006 C2 lists them, fish last.
const tileOrder: Tile[] = ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish']
type Step = 'region' | 'tiles' | 'ready'
type Region = { id: string; name: string; status: string }

export function Onboarding() {
  const [step, setStep] = useState<Step>('region')
  const [region, setRegion] = useState<Region | null>(null)
  const [tiles, setTiles] = useState<Set<Tile>>(() => new Set(allTiles))
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-paper" data-testid={`onboarding-${step}`}>
      {step === 'region' && <RegionScreen onChosen={(r) => { setRegion(r); setStep('tiles') }} />}
      {step === 'tiles' && region && <TilesScreen region={region} tiles={tiles} setTiles={setTiles} onNext={() => setStep('ready')} />}
      {step === 'ready' && region && <ReadyScreen region={region} tiles={tiles} />}
    </div>
  )
}

// ── 1 · Region ────────────────────────────────────────────────────────────────

function RegionScreen({ onChosen }: { onChosen: (r: Region) => void }) {
  const t = useTranslations('onboarding')
  const locale = useLocale()
  const trpc = useTRPC()
  const qc = useQueryClient()
  const [mode, setMode] = useState<'locate' | 'search'>('locate')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { const h = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(h) }, [query])

  const results = useQuery(trpc.dex.lookupRegion.queryOptions({ q: debounced }, { enabled: mode === 'search' && debounced.length >= 2 }))
  const request = useMutation(trpc.dex.requestRegion.mutationOptions({ onSuccess: (r) => onChosen(r), onError: () => setError(t('error')) }))

  const locate = () => {
    setError(null)
    if (!('geolocation' in navigator)) { setMode('search'); setError(t('noLocation')); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const units = await qc.fetchQuery(trpc.dex.lookupRegion.queryOptions({ lat: coords.latitude, lng: coords.longitude }))
          if (!units[0]) throw new Error('no unit')
          request.mutate({ gadmGid: units[0].gadmGid })
        } catch {
          setError(t('noLocation')); setMode('search')
        } finally { setLocating(false) }
      },
      () => { setLocating(false); setError(t('noLocation')); setMode('search') },
      { timeout: 15_000, maximumAge: 300_000 },
    )
  }
  const busy = locating || request.isPending

  return (
    <div className="relative flex min-h-full flex-col bg-night text-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote CC BY photo, static export */}
      <img src={SPLASH.url} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: SPLASH.position }} />
      <div className="absolute inset-0 bg-gradient-to-b from-night/15 via-night/60 via-45% to-night to-90%" />
      <div className="relative mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-end px-6 pt-[40vh]" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        {/* The splash stays dark in both themes (spec §🎨): only theme-stable tokens here (night, moss, white). */}
        <div className="text-[13px] font-bold tracking-[0.12em] text-moss uppercase">{t('eyebrow')}</div>
        <h1 className="mt-2 text-[34px] leading-[1.1] font-bold tracking-tight">{t('headline')}</h1>
        <p className="mt-3 text-[17px] leading-snug text-white/85">{t('promise')}</p>
        <p className="mt-6 text-[15px] text-white/75">{t('question')}</p>

        {mode === 'locate' ? (
          <>
            <button type="button" onClick={locate} disabled={busy} data-testid="locate" className="mt-3 h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white disabled:opacity-60">
              📍 {busy ? t('working') : t('useLocation')}
            </button>
            <p className="mt-2 text-[13px] leading-snug text-white/70">{t('locationHint')}</p>
            <button type="button" onClick={() => setMode('search')} className="mt-4 h-13 w-full rounded-2xl border border-white/40 py-3.5 text-[17px] font-semibold text-white">
              {t('typePlace')}
            </button>
          </>
        ) : (
          <>
            <label className="mt-3 flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-night">
              <Icon name="search" size={20} className="shrink-0 text-night/60" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('placePlaceholder')} data-testid="place" className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-night/40" />
            </label>
            {debounced.length >= 2 && (
              <ul className="mt-2 overflow-hidden rounded-2xl bg-white text-night" data-testid="places">
                {results.isLoading && <li className="px-4 py-3 text-[15px] text-night/60">{t('working')}</li>}
                {results.data?.length === 0 && <li className="px-4 py-3 text-[15px] text-night/60">{t('noPlace')}</li>}
                {results.data?.map((u, i) => (
                  <li key={u.gadmGid} className={i ? 'border-t border-night/10' : ''}>
                    <button type="button" disabled={busy} onClick={() => request.mutate({ gadmGid: u.gadmGid })} className="w-full px-4 py-3 text-left text-[17px] disabled:opacity-60">
                      <span className="font-semibold">{u.name}</span>
                      <span className="text-night/60"> · {[locale === 'de' ? u.type : u.typeEn, u.parent].filter(Boolean).join(', ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => { setMode('locate'); setError(null) }} className="mt-4 self-start text-[15px] text-white/75 underline underline-offset-4">
              {t('orUseLocation')}
            </button>
          </>
        )}
        {error && <p className="mt-3 text-[14px] text-amber-soft">{error}</p>}
        <p className="mt-6 text-[12px] text-white/55">{t('photo', { author: SPLASH.author, licence: SPLASH.licence, source: SPLASH.source })}</p>
      </div>
    </div>
  )
}

// ── 2 · Tiles ─────────────────────────────────────────────────────────────────

function TilesScreen({ region, tiles, setTiles, onNext }: { region: Region; tiles: Set<Tile>; setTiles: (s: Set<Tile>) => void; onNext: () => void }) {
  const t = useTranslations('onboarding')
  const tt = useTranslations('dex.tile')
  const trpc = useTRPC()
  const qc = useQueryClient()
  const ready = region.status === 'ready'
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region.id, tiles: allTiles, nowOnly: false }, { enabled: ready }))
  const counts = new Map(set.data?.tiles.map((x) => [x.tile, x.count]) ?? [])
  // Fish is shown only when the region's set has some (E12). Before the set exists we cannot know: the seven land tiles.
  const shown = tileOrder.filter((x) => x !== 'fish' || (counts.get('fish') ?? 0) > 0)
  const setFilter = useMutation(trpc.identity.setFilter.mutationOptions({ onSuccess: () => { qc.invalidateQueries({ queryKey: trpc.identity.pathKey() }); onNext() } }))
  const toggle = (x: Tile) => { const n = new Set(tiles); if (n.has(x)) n.delete(x); else n.add(x); setTiles(n) }
  const chosen = shown.filter((x) => tiles.has(x))

  return (
    <StepFrame step={2} title={t('tilesTitle')} body={t('tilesBody')}
      action={<button type="button" disabled={!chosen.length || setFilter.isPending} data-testid="tiles-next" onClick={() => setFilter.mutate({ regionId: region.id, tiles: chosen, nowOnly: false })} className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white disabled:opacity-50">{t('next')}</button>}>
      <ul className="mt-5 grid grid-cols-2 gap-3" data-testid="tiles">
        {shown.map((x) => {
          const on = tiles.has(x)
          const n = counts.get(x)
          return (
            <li key={x}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(x)} data-tile={x}
                className={`relative flex h-[104px] w-full items-center gap-2 rounded-2xl py-2 pr-7 pl-2.5 text-left ${on ? 'bg-card ring-2 ring-moss ring-inset' : 'bg-tile text-ink-faint'}`}>
                <OnboardingSilhouette tile={x} className={`h-10 w-10 shrink-0 ${on ? 'text-ink-soft' : 'text-ink-faint'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] leading-tight font-bold">{tt(x)}</span>
                  <span className={`mt-0.5 block text-[13px] leading-snug ${on ? 'text-ink-soft' : ''}`}>{n === undefined ? (ready ? '' : t('countsPending')) : t('speciesHere', { n })}</span>
                </span>
                <span className={`absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[14px] ${on ? 'text-moss' : 'border border-ink-faint'}`} aria-hidden>{on ? '✓' : ''}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {setFilter.isError && <p className="mt-3 text-[14px] text-amber">{t('error')}</p>}
    </StepFrame>
  )
}

// ── 3 · Ready ─────────────────────────────────────────────────────────────────

function ReadyScreen({ region, tiles }: { region: Region; tiles: Set<Tile> }) {
  const t = useTranslations('onboarding')
  const format = useFormatter()
  const trpc = useTRPC()
  const router = useRouter()
  // The filter is written; from here the app reads it back, polling while the region job runs (5 s, handoff 0007).
  const me = useQuery(trpc.identity.me.queryOptions(undefined, { refetchInterval: (q) => (q.state.data?.region?.status === 'queued' ? 5000 : false) }))
  const status = me.data?.region?.status ?? region.status
  const ready = status === 'ready'
  const chosen = allTiles.filter((x) => tiles.has(x))
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region.id, tiles: chosen, nowOnly: true }, { enabled: ready }))
  const month = format.dateTime(new Date(), { month: 'long' })
  const nine = (set.data?.species ?? []).filter((s) => s.lead).slice(0, 9)

  return (
    <StepFrame step={3} title={t('readyTitle')}
      body={ready && set.data
        ? t.rich('readyBody', { n: set.data.species.length, month, region: region.name, b: (c) => <strong className="text-ink">{c}</strong> })
        : status === 'failed' ? t('readyFailed', { region: region.name }) : t('readyPreparing', { region: region.name })}
      action={<button type="button" data-testid="go" onClick={() => router.replace('/')} className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white">{t('go')}</button>}>
      <ul className="mt-5 grid grid-cols-3 gap-3" data-testid="preview">
        {Array.from({ length: 9 }, (_, i) => nine[i]).map((s, i) => (
          <li key={s?.taxonId ?? i} className="aspect-square overflow-hidden rounded-2xl bg-tile">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts */}
            {s?.lead && <img src={s.lead.url} alt="" className="h-full w-full object-cover opacity-45 grayscale" />}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-2xl bg-amber-soft px-4 py-3 text-[16px] leading-snug"><span className="mr-2" aria-hidden>📖</span>{t.rich('axisStudy', { b: (c) => <strong>{c}</strong> })}</div>
      <div className="mt-2 rounded-2xl bg-moss-soft px-4 py-3 text-[16px] leading-snug"><span className="mr-2" aria-hidden>👁️</span>{t.rich('axisSeen', { b: (c) => <strong>{c}</strong> })}</div>
      <p className="mt-6 text-center text-[14px] leading-snug text-ink-faint">{t('noAccount')}</p>
    </StepFrame>
  )
}

function StepFrame({ step, title, body, children, action }: { step: number; title: string; body: React.ReactNode; children: React.ReactNode; action: React.ReactNode }) {
  const t = useTranslations('onboarding')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollIntoView() }, [])
  return (
    <div ref={ref} className="mx-auto flex min-h-full max-w-[520px] flex-col px-5 pt-8" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      <div className="text-[15px] text-ink-faint">{t('stepOf', { step, of: 3 })}</div>
      <h1 className="mt-1 text-[32px] leading-[1.1] font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-[18px] leading-snug text-ink-soft">{body}</p>
      <div className="flex-1">{children}</div>
      <div className="sticky bottom-0 -mx-5 mt-6 bg-paper px-5 pt-3">{action}</div>
    </div>
  )
}
