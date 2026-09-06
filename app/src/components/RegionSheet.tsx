'use client'

import { useEffect, useState } from 'react'
import { hashKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import type { RegionStatus } from '@/generated/prisma/enums'
import { isNetworkError, useTRPC } from '@/trpc/client'
import { allTiles } from './AtlasCounters'
import { Icon } from './Marks'
import { useOffline } from './OfflineBanner'
import { Sheet, useSheetClose } from './Sheet'

type RegionRow = { id: string; name: string; status: RegionStatus }

// ── The switch (handoff 0018 R5) ──────────────────────────────────────────────
// Optimistic: `identity.me` shows the new active region before the server answers, so the grid, the counters, the
// log search and the scan refetch at once (their queries key by `regionId`). Without network the mutation fails and the
// wish is kept in localStorage; `RegionReplay` sends it when the signal is back and keeps `me` on it until then.
const PENDING_KEY = 'dex.region.pending'
const pendingRegion = (): string | null => { try { return localStorage.getItem(PENDING_KEY) } catch { return null } }
const setPending = (id: string | null) => { try { if (id) localStorage.setItem(PENDING_KEY, id); else localStorage.removeItem(PENDING_KEY) } catch { /* private mode */ } }

export function useRegionSwitch() {
  const trpc = useTRPC()
  const qc = useQueryClient()
  const meKey = trpc.identity.me.queryKey()
  const apply = (region: RegionRow) => qc.setQueryData(meKey, (old) => (old ? { ...old, region } : old))
  const mutation = useMutation(trpc.identity.setRegion.mutationOptions({
    onMutate: ({ regionId }) => { const r = qc.getQueryData(meKey)?.regions.find((x) => x.id === regionId); if (r) apply(r) },
    onSuccess: () => { setPending(null); void qc.invalidateQueries({ queryKey: meKey }) },
    onError: (e, { regionId }) => { if (isNetworkError(e)) setPending(regionId); else void qc.invalidateQueries({ queryKey: meKey }) },
  }))
  return { switchTo: (regionId: string) => mutation.mutate({ regionId }), pending: mutation.isPending }
}

/** Mounted once in the layout: replays a switch made without network, and keeps `me` on it while the server still says otherwise. */
export function RegionReplay() {
  const trpc = useTRPC()
  const qc = useQueryClient()
  const meKey = trpc.identity.me.queryKey()
  const replay = useMutation(trpc.identity.setRegion.mutationOptions({
    onSuccess: () => { setPending(null); void qc.invalidateQueries({ queryKey: meKey }) },
    onError: (e) => { if (!isNetworkError(e)) { setPending(null); void qc.invalidateQueries({ queryKey: meKey }) } }, // no longer in the list: the server's word stands
  }))
  const { mutate } = replay
  useEffect(() => {
    const run = () => { const id = pendingRegion(); if (id && navigator.onLine) mutate({ regionId: id }) }
    run()
    const visible = () => { if (document.visibilityState === 'visible') run() }
    window.addEventListener('online', run)
    document.addEventListener('visibilitychange', visible)
    return () => { window.removeEventListener('online', run); document.removeEventListener('visibilitychange', visible) }
  }, [mutate])
  useEffect(() => qc.getQueryCache().subscribe((e) => {
    if (e.type !== 'updated' || e.action.type !== 'success' || e.action.manual || e.query.queryHash !== hashKey(meKey)) return
    const id = pendingRegion()
    const data = qc.getQueryData(meKey)
    if (!id || !data || data.region?.id === id) return
    const r = data.regions.find((x) => x.id === id)
    if (r) qc.setQueryData(meKey, { ...data, region: r }); else setPending(null)
  }), [qc, meKey])
  return null
}

// ── The sheet (handoff 0018 R3) ───────────────────────────────────────────────
// "Meine Regionen": every ready region as a row, name · higher · set size · this month's count. The sky radio marks the
// active one, the checkbox on the right says "in my list". A row in the list: tap makes it active and closes. A row not
// in the list: tap adds it and makes it active (the trip to another country in one tap); its checkbox adds it without
// switching. The active region and the last one cannot be removed: one line says so. Offline: the list comes from the
// persisted `dex.regions`, the switch works for a region whose set is in the cache, the others say "erst online laden".
export function RegionSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations('regions')
  return (
    <Sheet onClose={onClose} labelledBy="regions-title" z="z-50" maxH="max-h-[85vh]" testId="region-sheet" handleTestId="region-sheet-handle"
      handle={<h2 id="regions-title" className="mt-4 text-[24px] leading-none font-bold tracking-tight">{t('title')}</h2>}>
      <Body />
    </Sheet>
  )
}

function Body() {
  const t = useTranslations('regions')
  const tc = useTranslations('common')
  const trpc = useTRPC()
  const qc = useQueryClient()
  const close = useSheetClose()
  const off = useOffline()
  const me = useQuery(trpc.identity.me.queryOptions())
  const regions = useQuery(trpc.dex.regions.queryOptions())
  const { switchTo } = useRegionSwitch()
  const [line, setLine] = useState<string | null>(null)
  const ready = (regions.data ?? []).filter((r) => r.status === 'ready')
  const mine = me.data?.regionIds ?? []
  const activeId = me.data?.region?.id ?? null
  const setFilter = useMutation(trpc.identity.setFilter.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.identity.me.queryKey() }),
    onError: () => setLine(tc('error')),
  }))
  const cached = (id: string) => qc.getQueryState(trpc.dex.set.queryKey({ regionId: id, tiles: allTiles, nowOnly: false }))?.data !== undefined

  const activate = (r: RegionRow) => {
    if (off && !cached(r.id)) return setLine(t('onlineFirst'))
    switchTo(r.id)
    close()
  }
  const add = (r: RegionRow, andSwitch: boolean) => {
    if (off) return setLine(t('offlineList'))
    const regionIds = [...mine, r.id]
    if (andSwitch) qc.setQueryData(trpc.identity.me.queryKey(), (old) => (old ? { ...old, region: r, regionIds, regions: [...old.regions, r] } : old))
    setFilter.mutate({ regionId: andSwitch || !activeId ? r.id : activeId, regionIds })
    if (andSwitch) close()
  }
  const remove = (r: RegionRow) => {
    if (off) return setLine(t('offlineList'))
    if (mine.length <= 1) return setLine(t('lastStays'))
    if (r.id === activeId) return setLine(t('activeStays'))
    setFilter.mutate({ regionId: activeId!, regionIds: mine.filter((id) => id !== r.id) })
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      {regions.isLoading && !regions.data && <p className="text-[15px] text-ink-soft">{tc('working')}</p>}
      <ul className="flex flex-col gap-2" data-testid="region-rows">
        {ready.map((r) => {
          const inList = mine.includes(r.id)
          const active = r.id === activeId
          const waits = off && inList && !cached(r.id)
          return (
            <li key={r.id} className={`flex items-center gap-3 rounded-2xl bg-card px-3 py-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)] ${active ? 'ring-[1.5px] ring-sky ring-inset' : ''}`} data-testid="region-row" data-region={r.id} data-active={active || undefined} data-in-list={inList || undefined}>
              <button type="button" role="radio" aria-checked={active} disabled={setFilter.isPending} onClick={() => (inList ? activate(r) : add(r, true))} data-testid="region-pick" className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60">
                <span aria-hidden className={`motion-toggle grid size-6 shrink-0 place-items-center rounded-full border-2 ${active ? 'border-sky' : 'border-ink/25'}`}>{active && <span className="motion-badge size-3 rounded-full bg-sky" />}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[18px] leading-tight font-bold ${active ? 'text-sky-deep' : ''}`} data-testid="region-row-name">{r.name}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-ink-soft">{r.higher}</span>
                  <span className="block text-[13px] text-ink-soft" data-testid="region-row-counts">{t('species', { n: r.setSize })} · {t('now', { n: r.nowCount })}</span>
                  {waits && <span className="mt-0.5 block text-[13px] font-semibold text-amber" data-testid="region-waits">{t('onlineFirst')}</span>}
                </span>
              </button>
              <button type="button" role="checkbox" aria-checked={inList} aria-label={t('inList', { region: r.name })} disabled={setFilter.isPending} onClick={() => (inList ? remove(r) : add(r, false))} data-testid="region-check"
                className={`motion-toggle grid size-7 shrink-0 place-items-center rounded-lg border-2 disabled:opacity-60 ${inList ? 'border-sky bg-sky text-white' : 'border-ink/25 bg-transparent text-transparent'}`}>
                <Icon name="check" size={16} />
              </button>
            </li>
          )
        })}
      </ul>
      {line && <p className="mt-3 text-[14px] text-amber" data-testid="region-line" role="status">{line}</p>}
      <p className="mt-4 text-[12px] text-ink-faint">{t('hint')}</p>
    </div>
  )
}
