'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Tile } from '@/generated/prisma/enums'
import { useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { Icon } from './Marks'
import { OnboardingSilhouette } from './OnboardingSilhouette'

// Spec §🎨 1, second pass (handoff 0013): four screens, one action each. Region (the ready regions as buttons, the
// location button as the shortcut), groups as tiles all on, a ready screen with the whole set and this month's count,
// then the two promises (ours and yours) before the atlas. No skip, no account. Rendered over the shell (z-30) so the
// bottom bar stays out of the first minute. "?change=1" is the drawer's Ändern: three screens (no promises), a way
// back, the current tiles kept.
//
// Only regions the ETL has prepared (status ready) can be chosen (owner, 2026-09-05). dex.requestRegion stays in place
// and unreachable from here until the loop is whole.

// The splash (handoff 0013 O2): the owner's licensed image (Adobe Stock, no credit line), local, behind every step.
// The `photo` string stays in the JSON for a CC BY splash from the set one day. Focus on the lit moss, lower third.
const SPLASH = { src: '/splash.jpg', srcSet: '/splash-720.jpg 720w, /splash.jpg 1440w', position: '50% 62%' }

// The place search (handoff 0013 O6) is off the screen while one region exists; the second region brings it back.
// The code and its server side stay (findings 0012 F1).
const SEARCH_MIN_REGIONS = 2

const allTiles = Object.values(Tile) as Tile[]
// The tiles screen's order: the big groups first, as findings 0006 C2 lists them, fish last.
const tileOrder: Tile[] = ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish']
type Step = 'region' | 'tiles' | 'ready' | 'promises'
type Region = { id: string; name: string; status: string }

export function Onboarding() {
  const change = useSearchParams().get('change') === '1'
  const trpc = useTRPC()
  const router = useRouter()
  const progress = useQuery(trpc.identity.progress.queryOptions(undefined, { enabled: change }))
  const [step, setStep] = useState<Step>('region')
  const [region, setRegion] = useState<Region | null>(null)
  const [tiles, setTiles] = useState<Set<Tile>>(() => new Set(allTiles))
  const of = change ? 3 : 4
  // In change mode the tiles screen starts from the current filter, not from "all on".
  const chosen = (r: Region) => { setRegion(r); if (change && progress.data?.tiles.length) setTiles(new Set(progress.data.tiles)); setStep('tiles') }
  const go = () => router.replace('/')
  // O4: the page's bottom edge is the splash's bottom edge, so Safari's bar blends with it. Only while this route shows.
  useEffect(() => {
    const els = [document.documentElement, document.body]
    const before = els.map((e) => e.style.backgroundColor)
    els.forEach((e) => { e.style.backgroundColor = 'var(--color-night-deep)' })
    return () => els.forEach((e, i) => { e.style.backgroundColor = before[i] })
  }, [])
  return (
    <div className="fixed inset-0 z-30 bg-night-deep text-white" data-testid={`onboarding-${step}`}>
      {/* The image once, behind every step; the content scrolls over it under the scrim. First paint is not blocked: async decode, high priority. */}
      <div className="absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- local image, static export, no optimiser */}
        <img src={SPLASH.src} srcSet={SPLASH.srcSet} sizes="100vw" alt="" fetchPriority="high" decoding="async" className="h-full w-full object-cover" style={{ objectPosition: SPLASH.position }} data-testid="splash" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/15 via-night/60 via-45% to-night-deep to-90%" />
      </div>
      <div className="relative h-full overflow-y-auto">
        {step === 'region' && <RegionScreen change={change} onChosen={chosen} />}
        {step === 'tiles' && region && <TilesScreen of={of} region={region} tiles={tiles} setTiles={setTiles} onNext={() => setStep('ready')} />}
        {step === 'ready' && region && <ReadyScreen of={of} region={region} tiles={tiles} onNext={change ? go : () => setStep('promises')} />}
        {step === 'promises' && <PromisesScreen of={of} onNext={go} />}
      </div>
    </div>
  )
}

// ── 1 · Region ────────────────────────────────────────────────────────────────

function RegionScreen({ change, onChosen }: { change: boolean; onChosen: (r: Region) => void }) {
  const t = useTranslations('onboarding')
  const locale = useLocale()
  const trpc = useTRPC()
  const qc = useQueryClient()
  const router = useRouter()
  const [mode, setMode] = useState<'locate' | 'search'>('locate')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { const h = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(h) }, [query])

  // O6: what exists is offered. The ready regions as buttons; the search only once there are two of them.
  const regions = useQuery(trpc.dex.regions.queryOptions())
  const ready = (regions.data ?? []).filter((r) => r.status === 'ready')
  const search = ready.length >= SEARCH_MIN_REGIONS

  // No retry (handoff 0012 F1): three retries with backoff kept "Einen Moment" up for seven seconds and the error never
  // showed. A failed search shows its error at once; the next keystroke is a new key and a new request.
  const results = useQuery(trpc.dex.lookupRegion.queryOptions({ q: debounced }, { enabled: mode === 'search' && debounced.length >= 2, retry: false }))
  const failedWith = results.error ? (results.error.message.split('\n').map((l) => l.trim()).find(Boolean) ?? 'error') : null
  type Unit = NonNullable<typeof results.data>[number]
  const available = (u: Unit) => u.region?.status === 'ready'
  const choose = (u: Unit) => onChosen({ id: u.region!.id, name: u.name, status: 'ready' })

  const locate = () => {
    setError(null)
    if (!('geolocation' in navigator)) { setError(t('noLocation')); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const units = await qc.fetchQuery(trpc.dex.lookupRegion.queryOptions({ lat: coords.latitude, lng: coords.longitude }))
          if (!units[0]) throw new Error('no unit')
          // Not ready here: the line says so, the region buttons stay (C3). No nearest-region snap: Region has no geometry.
          if (!available(units[0])) { setError(t('notAvailableHere', { name: units[0].name })); return }
          choose(units[0])
        } catch {
          setError(t('noLocation'))
        } finally { setLocating(false) }
      },
      () => { setLocating(false); setError(t('noLocation')) },
      { timeout: 15_000, maximumAge: 300_000 },
    )
  }
  const busy = locating

  return (
    <div className="relative flex min-h-full flex-col">
      {change && (
        <button type="button" onClick={() => router.back()} data-testid="cancel" className="absolute top-4 right-4 z-10 rounded-full bg-night/50 px-3.5 py-1.5 text-[14px] font-semibold text-white" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
          {t('cancel')}
        </button>
      )}
      <div className="relative mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-end px-6 pt-[40vh]" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        {/* The splash stays dark in both themes (spec §🎨): only theme-stable tokens here (night, moss, white). */}
        <div className="text-[13px] font-bold tracking-[0.12em] text-moss uppercase">{t('eyebrow')}</div>
        <h1 className="mt-2 text-[34px] leading-[1.1] font-bold tracking-tight">{t('headline')}</h1>
        <p className="mt-3 text-[17px] leading-snug text-white/85">{t('promise')}</p>
        <p className="mt-6 text-[15px] text-white/75">{t('question')}</p>

        {mode === 'locate' ? (
          <>
            <ul className="mt-3 flex flex-col gap-2" data-testid="regions">
              {ready.map((r) => (
                <li key={r.id}>
                  <button type="button" disabled={busy} data-region={r.id} onClick={() => onChosen({ id: r.id, name: r.name, status: r.status })} className="h-14 w-full truncate rounded-2xl bg-white px-4 text-left text-[18px] font-bold text-night disabled:opacity-60">
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={locate} disabled={busy} data-testid="locate" className={`${ready.length ? 'mt-2' : 'mt-3'} h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white disabled:opacity-60`}>
              {busy ? t('working') : t('useLocation')}
            </button>
            {search && (
              <button type="button" onClick={() => setMode('search')} className="mt-4 h-13 w-full rounded-2xl border border-white/40 py-3.5 text-[17px] font-semibold text-white">
                {t('typePlace')}
              </button>
            )}
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
                {failedWith && <li className="px-4 py-3 text-[15px] text-amber" data-testid="place-error">{t('searchFailed')} <span className="text-night/50">· {failedWith}</span></li>}
                {results.data?.length === 0 && <li className="px-4 py-3 text-[15px] text-night/60">{t('noPlace')}</li>}
                {results.data?.map((u, i) => {
                  const ok = available(u)
                  return (
                    <li key={u.gadmGid} className={i ? 'border-t border-night/10' : ''}>
                      <button type="button" disabled={busy || !ok} aria-disabled={!ok} data-available={ok} onClick={() => choose(u)} className={`w-full px-4 py-3 text-left text-[17px] ${ok ? '' : 'text-night/50'}`}>
                        <span className="font-semibold">{u.name}</span>
                        <span className="text-night/60"> · {[locale === 'de' ? u.type : u.typeEn, u.parent].filter(Boolean).join(', ')}</span>
                        {!ok && <span className="block text-[14px] text-night/50">{t('notAvailable')}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <button type="button" onClick={() => { setMode('locate'); setError(null) }} className="mt-4 self-start text-[15px] text-white/75 underline underline-offset-4">
              {t('orUseLocation')}
            </button>
          </>
        )}
        {error && <p className="mt-3 text-[14px] text-amber" data-testid="region-error">{error}</p>}
      </div>
    </div>
  )
}

// ── 2 · Tiles ─────────────────────────────────────────────────────────────────

function TilesScreen({ of, region, tiles, setTiles, onNext }: { of: number; region: Region; tiles: Set<Tile>; setTiles: (s: Set<Tile>) => void; onNext: () => void }) {
  const t = useTranslations('onboarding')
  const tt = useTranslations('dex.tile')
  const trpc = useTRPC()
  const qc = useQueryClient()
  const ready = region.status === 'ready'
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region.id, tiles: allTiles, nowOnly: false }, { enabled: ready }))
  const counts = new Map(set.data?.tiles.map((x) => [x.tile, x.count]) ?? [])
  // O8a: the thumb is the set's lead image of the tile's first species ("jetzt wahrscheinlich" first, the grid's order),
  // the small variant the grid uses; the silhouette only before the set exists or when no member has an image.
  const thumbs = new Map<Tile, string>()
  for (const s of set.data?.species ?? []) if (!thumbs.has(s.tile) && s.leadSmall) thumbs.set(s.tile, s.leadSmall)
  // Fish is shown only when the region's set has some (E12). Before the set exists we cannot know: the seven land tiles.
  const shown = tileOrder.filter((x) => x !== 'fish' || (counts.get('fish') ?? 0) > 0)
  const setFilter = useMutation(trpc.identity.setFilter.mutationOptions({ onSuccess: () => { qc.invalidateQueries({ queryKey: trpc.identity.pathKey() }); onNext() } }))
  const toggle = (x: Tile) => { const n = new Set(tiles); if (n.has(x)) n.delete(x); else n.add(x); setTiles(n) }
  const chosen = shown.filter((x) => tiles.has(x))

  return (
    <StepFrame step={2} of={of} title={t('tilesTitle')} body={t('tilesBody')}
      action={<button type="button" disabled={!chosen.length || setFilter.isPending} data-testid="tiles-next" onClick={() => setFilter.mutate({ regionId: region.id, tiles: chosen, nowOnly: false })} className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white disabled:opacity-50">{t('next')}</button>}>
      <ul className="mt-5 grid grid-cols-2 gap-3" data-testid="tiles">
        {shown.map((x) => {
          const on = tiles.has(x)
          const n = counts.get(x)
          const thumb = thumbs.get(x)
          return (
            <li key={x}>
              {/* The grid's cell language (spec §🎨 2), theme-stable over the splash: on = white card, the photo in colour, the moss check on it;
                  off = glass, greyscale at 45 %, no check. Stacked so the German group names never truncate at 360 px. */}
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(x)} data-tile={x}
                className={`flex h-[108px] w-full flex-col rounded-2xl p-3 text-left ${on ? 'bg-white text-night ring-2 ring-moss ring-inset' : 'bg-white/10 text-white/60'}`}>
                <span className="relative h-11 w-11 shrink-0">
                  <span className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full ${on ? 'bg-tile' : 'bg-white/10'}`}>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser
                      <img src={thumb} alt="" loading="lazy" decoding="async" className={`h-full w-full object-cover ${on ? '' : 'opacity-45 grayscale'}`} />
                    ) : (
                      <OnboardingSilhouette tile={x} className={`h-7 w-7 ${on ? 'text-ink-soft' : 'text-white/40'}`} />
                    )}
                  </span>
                  {on && <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-moss text-[12px] font-bold text-white ring-2 ring-white" aria-hidden>✓</span>}
                </span>
                <span className="mt-auto block w-full truncate text-[15px] leading-tight font-bold">{tt(x)}</span>
                <span className={`mt-0.5 block text-[13px] leading-tight ${on ? 'text-ink-soft' : ''}`}>{n === undefined ? (ready ? '' : t('countsPending')) : t('speciesHere', { n })}</span>
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

function ReadyScreen({ of, region, tiles, onNext }: { of: number; region: Region; tiles: Set<Tile>; onNext: () => void }) {
  const t = useTranslations('onboarding')
  const format = useFormatter()
  const trpc = useTRPC()
  // The filter is written; from here the app reads it back, polling while the region job runs (5 s, handoff 0007).
  const me = useQuery(trpc.identity.me.queryOptions(undefined, { refetchInterval: (q) => (q.state.data?.region?.status === 'queued' ? 5000 : false) }))
  const status = me.data?.region?.status ?? region.status
  const ready = status === 'ready'
  const chosen = allTiles.filter((x) => tiles.has(x))
  // O9a: two numbers from one read. `setSize` is the whole region's set; this month's count is the `now` members of
  // the chosen tiles, which is exactly what `nowOnly: true` would return (dex.ts filters on the same flag).
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region.id, tiles: chosen, nowOnly: false }, { enabled: ready }))
  const month = format.dateTime(new Date(), { month: 'long' })
  const now = set.data?.species.filter((s) => s.now) ?? []
  const nine = now.filter((s) => s.lead).slice(0, 9)
  const last = of === 3

  return (
    <StepFrame step={3} of={of} title={t('readyTitle')}
      body={ready && set.data
        ? t.rich('readyBody', { n: now.length, total: set.data.setSize, month, region: region.name, b: (c) => <strong className="text-white" data-testid="number">{c}</strong> })
        : status === 'failed' ? t('readyFailed', { region: region.name }) : t('readyPreparing', { region: region.name })}
      action={<button type="button" data-testid={last ? 'go' : 'ready-next'} onClick={onNext} className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white">{last ? t('go') : t('next')}</button>}>
      <ul className="mt-5 grid grid-cols-3 gap-3" data-testid="preview">
        {Array.from({ length: 9 }, (_, i) => nine[i]).map((s, i) => (
          <li key={s?.taxonId ?? i} className="aspect-square overflow-hidden rounded-2xl bg-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts */}
            {s?.lead && <img src={s.leadSmall ?? s.lead.url} alt="" loading="lazy" className="h-full w-full object-cover opacity-45 grayscale" />}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-[16px] leading-snug text-white/90"><span className="mr-2" aria-hidden>📖</span>{t.rich('axisStudy', { b: (c) => <strong className="text-white">{c}</strong> })}</div>
      <div className="mt-2 rounded-2xl bg-white/10 px-4 py-3 text-[16px] leading-snug text-white/90"><span className="mr-2" aria-hidden>👁️</span>{t.rich('axisSeen', { b: (c) => <strong className="text-white">{c}</strong> })}</div>
    </StepFrame>
  )
}

// ── 4 · Promises ──────────────────────────────────────────────────────────────

// Handoff 0013 O1 O10: ours (no account, no leaderboard, the data stays here, only the Landkreis is stored) and yours
// (the owner's words). No checkbox, no legal tone; "Bin dabei" is the whole consent. Skipped in change mode.
function PromisesScreen({ of, onNext }: { of: number; onNext: () => void }) {
  const t = useTranslations('onboarding')
  return (
    <StepFrame step={4} of={of} title={t('promisesTitle')} body={null}
      action={<button type="button" data-testid="go" onClick={onNext} className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white">{t('promisesGo')}</button>}>
      <div className="mt-5 flex flex-col gap-3" data-testid="promises">
        <div className="rounded-2xl bg-white/10 px-4 py-4">
          <div className="text-[13px] font-bold tracking-[0.12em] text-moss uppercase">{t('promisesOurs')}</div>
          <p className="mt-2 text-[17px] leading-snug text-white/90">{t('promisesOursText')}</p>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-4">
          <div className="text-[13px] font-bold tracking-[0.12em] text-moss uppercase">{t('promisesYours')}</div>
          <p className="mt-2 text-[17px] leading-snug text-white/90">{t('promisesYoursText')}</p>
        </div>
      </div>
    </StepFrame>
  )
}

// One frame for steps 2–4 over the splash: white on the scrim, theme-stable tokens only; the action sticks to the
// bottom on a fade to the page's bottom colour so the list scrolls under it.
function StepFrame({ step, of, title, body, children, action }: { step: number; of: number; title: string; body: React.ReactNode; children: React.ReactNode; action: React.ReactNode }) {
  const t = useTranslations('onboarding')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollIntoView() }, [])
  return (
    <div ref={ref} className="mx-auto flex min-h-full max-w-[520px] flex-col px-5" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      <div className="text-[15px] text-white/60">{t('stepOf', { step, of })}</div>
      <h1 className="mt-1 text-[32px] leading-[1.1] font-bold tracking-tight">{title}</h1>
      {body && <p className="mt-2 text-[18px] leading-snug text-white/80">{body}</p>}
      <div className="flex-1">{children}</div>
      <div className="sticky bottom-0 -mx-5 mt-6 bg-gradient-to-t from-night-deep from-60% to-transparent px-5 pt-6">{action}</div>
    </div>
  )
}
