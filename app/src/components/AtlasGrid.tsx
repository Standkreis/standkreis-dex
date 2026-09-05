'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import type { Tile } from '@/generated/prisma/enums'
import { Link, useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { allTiles, countersOf, CountersBar, useAtlasSet } from './AtlasCounters'
import { search } from './AtlasSearch'
import { FilterDrawer, SHOWS, SORTS, type Show, type Sort } from './FilterDrawer'
import { FillSheet, Toast } from './Fill'
import { Icon } from './Marks'
import { OnboardingSilhouette } from './OnboardingSilhouette'

type Species = NonNullable<ReturnType<typeof useAtlasSet>['set']>['species'][number]

// The Atlas grid of spec §🎨 2 on the real set (handoff 0007 Track A). Header: title, one bar amber-then-green with the
// three counters; one search bar with the filter button and its badge; the 3-column grid; one sources line. Region and
// tiles live in the identity's Filter, state · sort · "nur jetzt" · query in the URL so back restores them.
export function AtlasGrid({ title }: { title: string }) {
  const t = useTranslations('dex')
  const tc = useTranslations('common')
  const locale = useLocale()
  const format = useFormatter()
  const trpc = useTRPC()
  const qc = useQueryClient()
  const router = useRouter()

  // No region yet → onboarding. While a region job runs, poll every 5 s; a failed job offers a retry.
  const me = useQuery(trpc.identity.me.queryOptions(undefined, { refetchInterval: (q) => (q.state.data?.region?.status === 'queued' ? 5000 : false) }))
  const region = me.data?.region ?? null
  useEffect(() => { if (me.data && !me.data.region) router.replace('/onboarding') }, [me.data, router])
  const regions = useQuery(trpc.dex.regions.queryOptions(undefined, { enabled: region?.status === 'failed' }))
  const retry = useMutation(trpc.dex.requestRegion.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: trpc.identity.me.queryKey() }) }))

  const { ready, set, progress: progressRaw, tiles, loading } = useAtlasSet(region)

  // ── URL state: ?show ?sort ?now ?q, plus ?fill / ?again from the save screen ──
  const params = useSearchParams()
  const fillId = params.get('fill')
  const againId = params.get('again')
  // The fill moment (spec §🎨 5): the cell is drawn grey until the sweep, so the progress hides the taxon in phase "pre".
  const fill = useQuery(trpc.sighting.fill.queryOptions({ id: fillId ?? againId ?? '' }, { enabled: !!(fillId ?? againId), staleTime: Infinity }))
  // The phase is keyed by the sighting id, so a new ?fill starts at "pre" without a resetting effect.
  const [fillDone, setFillDone] = useState<string | null>(null)
  const fillPhase: 'pre' | 'done' = fillId && fillDone === fillId ? 'done' : 'pre'
  const [tick, setTick] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const hidden = fillId && fillPhase === 'pre' ? fill.data?.taxon.id : undefined
  const progress = useMemo(() => (progressRaw && hidden ? { ...progressRaw, seen: progressRaw.seen.filter((id) => id !== hidden) } : progressRaw), [progressRaw, hidden])
  const studied = useMemo(() => new Set(progress?.studied ?? []), [progress])
  const seen = useMemo(() => new Set(progress?.seen ?? []), [progress])
  const counters = countersOf(set, progress, tiles)
  const show = (SHOWS as string[]).includes(params.get('show') ?? '') ? (params.get('show') as Show) : 'all'
  const sort = (SORTS as string[]).includes(params.get('sort') ?? '') ? (params.get('sort') as Sort) : 'now'
  const nowOnly = params.get('now') === '1'
  const query = params.get('q') ?? ''
  const setParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') next.delete(k); else next.set(k, v) }
    const qs = next.toString()
    // A plain replaceState with no Next state object: the router notices it and useSearchParams follows (Next ≥ 14.1).
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [])

  const name = useCallback((s: { names: Record<string, string>; sciName: string }) => s.names[locale] ?? s.names.de ?? s.names.en ?? s.sciName, [locale])

  // ── Tiles: the identity's Filter, written at once, read back through identity.progress ──
  const setFilter = useMutation(trpc.identity.setFilter.mutationOptions({ onSettled: () => qc.invalidateQueries({ queryKey: trpc.identity.progress.queryKey() }) }))
  const tilesShown = useMemo(() => (set?.tiles ?? []).filter((x) => x.count > 0), [set])
  const tilesOn = useMemo(() => new Set(tiles.filter((x) => tilesShown.some((s) => s.tile === x))), [tiles, tilesShown])
  const writeTiles = (next: Tile[]) => {
    if (!region) return
    qc.setQueryData(trpc.identity.progress.queryKey(), (old) => (old ? { ...old, tiles: next } : old))
    setFilter.mutate({ regionId: region.id, tiles: next, nowOnly })
  }
  const toggleTile = (x: Tile) => {
    const next = new Set(tilesOn)
    if (next.has(x)) { if (next.size === 1) return; next.delete(x) } else next.add(x)
    writeTiles(allTiles.filter((y) => next.has(y)))
  }

  // ── The fill: wait for the fresh progress, switch the tile on if it was off (doubt 14), scroll, sweep after 350 ms ──
  const fillTaxon = fillId && fill.data && progressRaw?.seen.includes(fill.data.taxon.id) ? fill.data.taxon : null
  const fillTileOff = !!fillTaxon && tilesShown.some((x) => x.tile === fillTaxon.tile) && !tilesOn.has(fillTaxon.tile as Tile)
  useEffect(() => {
    if (fillTileOff && fillTaxon) writeTiles(allTiles.filter((y) => tilesOn.has(y) || y === fillTaxon.tile))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- writeTiles is rebuilt every render; the tile switch runs once per fill
  }, [fillTileOff])
  useEffect(() => {
    if (!fillTaxon || fillTileOff || fillPhase !== 'pre') return
    const el = document.querySelector(`[data-taxon="${fillTaxon.id}"]`)
    el?.scrollIntoView({ block: 'center' })
    const h = setTimeout(() => {
      setFillDone(fillId)
      setTick(true)
      navigator.vibrate?.(30)
    }, el ? 350 : 0)
    return () => clearTimeout(h)
  }, [fillTaxon, fillTileOff, fillPhase, fillId])
  useEffect(() => { if (tick) { const h = setTimeout(() => setTick(false), 1600); return () => clearTimeout(h) } }, [tick])
  // A repeat (doubt 12): the quiet toast, derived from ?again; the param is dropped when the toast goes.
  const tf = useTranslations('fill')
  const tl = useTranslations('log')
  const againToast = againId && fill.data ? tf('again', { name: name(fill.data.taxon) }) : null
  const shownToast = toast ?? againToast
  const toastDone = useCallback(() => { setToast(null); if (againId) setParams({ again: null }) }, [againId, setParams])

  // ── The visible species: tiles → chip → state → sort → search ──────────────
  const visible = useMemo(() => {
    if (!set || !progress) return []
    let list = set.species.filter((s) => tilesOn.has(s.tile))
    if (nowOnly) list = list.filter((s) => s.now)
    if (show === 'studied') list = list.filter((s) => studied.has(s.taxonId))
    if (show === 'seen') list = list.filter((s) => seen.has(s.taxonId))
    if (show === 'new') list = list.filter((s) => !seen.has(s.taxonId))
    if (sort === 'name') list = [...list].sort((a, b) => name(a).localeCompare(name(b), locale) || a.sciName.localeCompare(b.sciName))
    if (sort === 'seen') {
      const at = (s: Species) => progress.seenAt[s.taxonId] ?? ''
      list = [...list].sort((a, b) => (at(b) > at(a) ? 1 : at(b) < at(a) ? -1 : 0)) // the server's "jetzt" order breaks ties
    }
    return search(list, query, name)
  }, [set, progress, tilesOn, nowOnly, show, sort, query, studied, seen, name, locale])

  // The badge counts what narrows the grid: any tile off, a state other than Alle, the chip. Sort orders, it does not filter.
  const active = (tilesShown.length > tilesOn.size ? 1 : 0) + (show !== 'all' ? 1 : 0) + (nowOnly ? 1 : 0)

  // ── Drawer, and the floating button once the search bar has scrolled away ──
  const [drawer, setDrawer] = useState<null | 'bar' | 'fab'>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [barGone, setBarGone] = useState(false)
  useEffect(() => {
    if (!bar.current) return
    const io = new IntersectionObserver(([e]) => setBarGone(!e.isIntersecting), { threshold: 0 })
    io.observe(bar.current)
    return () => io.disconnect()
  }, [ready, set])
  const month = format.dateTime(new Date(), { month: 'long' })
  const reset = () => { setParams({ show: null, sort: null, now: null, q: null }); if (tilesShown.length > tilesOn.size) writeTiles(allTiles) }

  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-24">
      <div className="flex h-10 items-center">
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{title}</h1>
      </div>
      {region?.status === 'queued' && <p className="mt-3 text-[15px] text-ink-soft" data-testid="preparing">{region.name} · {t('preparing')}</p>}
      {region?.status === 'failed' && (
        <p className="mt-3 text-[15px] text-ink-soft">
          {t('failed', { region: region.name })}{' '}
          <button type="button" className="font-semibold text-moss-deep" disabled={retry.isPending}
            onClick={() => { const gid = regions.data?.find((r) => r.id === region.id)?.gadmGid; if (gid) retry.mutate({ gadmGid: gid }) }}>{t('retry')}</button>
        </p>
      )}

      {set && progress && counters.state === 'ready' && (
        <>
          <div className="mt-3 flex items-center gap-3">
            <CountersBar counters={counters} className="min-w-8 flex-1" />
            <p className="shrink-0 text-[15px]" data-testid="counters">
              <span className="font-bold text-amber">{t('studied', { n: counters.studied })}</span>
              <span className="text-ink-soft"> · </span>
              <span className={`inline-block font-bold text-moss-deep ${tick ? 'animate-[fill-tick_500ms_ease-out] rounded-md bg-moss-soft px-1' : ''}`} data-testid="seen-count">{t('seen', { n: counters.seen })}</span>
              {tick && <span className="ml-1 inline-block rounded-full bg-moss px-1.5 text-[12px] font-bold text-white" data-testid="plus-one">{tf('plusOne')}</span>}
              <span className="text-ink-soft"> · {t('possible', { n: counters.possible })}</span>
            </p>
          </div>

          <div ref={bar} className="mt-4 flex h-13 items-center gap-3 rounded-2xl bg-card pr-1.5 pl-4 shadow-[0_2px_12px_rgba(30,42,35,0.06)]" data-testid="bar">
            <Icon name="search" size={20} className="shrink-0 text-ink-faint" />
            <input value={query} onChange={(e) => setParams({ q: e.target.value })} placeholder={t('search')} data-testid="search" enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-faint" />
            <FilterButton count={active} label={t('filters')} onClick={() => setDrawer('bar')} className="relative h-10 w-10 bg-moss-soft text-moss-deep" />
          </div>

          {visible.length === 0 ? (
            <p className="mt-6 text-center text-[15px] text-ink-soft" data-testid="empty">{query.trim() ? t('noMatch', { q: query.trim() }) : t('empty')}</p>
          ) : (
            <ul className="mt-4 grid grid-cols-3 gap-2" data-testid="grid">
              {visible.map((s) => <Cell key={s.taxonId} s={s} name={name(s)} isSeen={seen.has(s.taxonId)} isStudied={studied.has(s.taxonId)} badge={t('studiedBadge')} fill={fill.data?.taxon.id === s.taxonId && fillId ? fillPhase : null} />)}
            </ul>
          )}
          <p className="mt-4 text-[12px] text-ink-faint">{t('sources')}</p>

          {barGone && (
            <FilterButton count={active} label={t('filters')} onClick={() => setDrawer('fab')} testId="fab"
              className="fixed right-4 z-20 h-14 w-14 bg-ink text-paper shadow-lg" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }} />
          )}
          {drawer && region && (
            <FilterDrawer
              focusSearch={drawer === 'fab'} query={query} regionName={region.name} tiles={tilesShown} tilesOn={tilesOn} show={show} sort={sort} nowOnly={nowOnly} month={month} results={visible.length}
              onClose={() => setDrawer(null)} onQuery={(q) => setParams({ q })} onChangeRegion={() => router.push('/onboarding?change=1')}
              onToggleTile={toggleTile} onShow={(s) => setParams({ show: s === 'all' ? null : s })} onSort={(s) => setParams({ sort: s === 'now' ? null : s })}
              onNowOnly={(on) => setParams({ now: on ? '1' : null })} onReset={reset} />
          )}
          {fillId && fillPhase === 'done' && fill.data && (
            <FillSheet s={fill.data} onClose={() => setParams({ fill: null })} onPhoto={() => setToast(tl('photoSoon'))} />
          )}
          {shownToast && <Toast key={shownToast} text={shownToast} onDone={toastDone} />}
        </>
      )}
      {loading && <p className="mt-3 text-[15px] text-ink-soft">{tc('working')}</p>}
    </main>
  )
}

function FilterButton({ count, label, onClick, className, style, testId }: { count: number; label: string; onClick: () => void; className: string; style?: React.CSSProperties; testId?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={count ? `${label} · ${count}` : label} data-testid={testId ?? 'filter-button'} style={style}
      className={`flex shrink-0 items-center justify-center rounded-full ${className}`}>
      <Icon name="sliders" size={22} />
      {count > 0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-moss px-1 text-[12px] font-bold text-white ring-2 ring-card" data-testid="badge">{count}</span>}
    </button>
  )
}

// One cell, three states (findings 0002 revision 3): not yet = greyscale 45 %, studied = greyscale 70 % with an amber
// inset ring and the book, discovered = colour with the check. Species without an image show the group silhouette.
// `fill` = the cell of the fill moment: "pre" is drawn grey with the transition armed, "done" sweeps to colour over 400 ms under a green ring.
function Cell({ s, name, isSeen, isStudied, badge, fill }: { s: Species; name: string; isSeen: boolean; isStudied: boolean; badge: string; fill: 'pre' | 'done' | null }) {
  return (
    <li className="min-w-0" data-taxon={s.taxonId} data-fill={fill ?? undefined}>
      <Link href={`/species/${s.gbifKey}`} className="block">
        <div className={`relative aspect-square overflow-hidden rounded-2xl bg-tile ${isStudied && !isSeen ? 'ring-2 ring-amber ring-inset' : ''} ${fill === 'done' ? 'ring-[3px] ring-moss' : ''}`}>
          {s.lead ? (
            // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser
            <img src={s.lead.url} alt="" loading="lazy" className={`h-full w-full object-cover ${fill ? 'transition-[filter,opacity] duration-[400ms] ease-out' : ''} ${isSeen ? '' : isStudied ? 'opacity-70 grayscale' : 'opacity-45 grayscale'}`} />
          ) : (
            <OnboardingSilhouette tile={s.tile} className="h-full w-full p-6 text-ink-faint opacity-60" />
          )}
          {isSeen && <span className="absolute right-1.5 bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-moss text-[12px] font-bold text-white">✓</span>}
          {isStudied && <span className="absolute bottom-1.5 left-1.5 text-[12px]" aria-label={badge}>📖</span>}
        </div>
        <div className={`mt-1 truncate text-[12px] leading-tight ${isSeen || isStudied ? 'font-semibold' : 'text-ink-soft'}`}>{name}</div>
      </Link>
    </li>
  )
}
