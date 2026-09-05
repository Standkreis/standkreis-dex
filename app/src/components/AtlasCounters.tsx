'use client'

import { useQuery } from '@tanstack/react-query'
import { Tile } from '@/generated/prisma/enums'
import { useTRPC } from '@/trpc/client'

export const allTiles = Object.values(Tile) as Tile[]

export type SetCounters =
  | { state: 'preparing' }
  | { state: 'ready'; studied: number; seen: number; both: number; possible: number }

/**
 * The one read behind the grid and Profil (handoff 0007 §🔀): the whole-year set of the region for all tiles, plus the
 * identity's progress and its filter tiles. Tiles, "nur jetzt", state and search are applied on the client, so a chip
 * toggles without a refetch and both screens share one cache entry.
 */
export function useAtlasSet(region: { id: string; status: string } | null) {
  const trpc = useTRPC()
  const ready = region?.status === 'ready'
  const progress = useQuery(trpc.identity.progress.queryOptions(undefined, { enabled: ready }))
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region?.id ?? '', tiles: allTiles, nowOnly: false }, { enabled: ready }))
  const tiles: Tile[] = progress.data?.tiles.length ? progress.data.tiles : allTiles
  return { ready, progress: progress.data ?? null, set: set.data ?? null, tiles, loading: ready && (progress.isLoading || set.isLoading) }
}

/** studiert · entdeckt · möglich over the species of the filter's tiles, whole year (findings 0002 doubt 41). */
export function countersOf(set: { species: { taxonId: string; tile: Tile }[] } | null, progress: { studied: string[]; seen: string[] } | null, tiles: Tile[]): SetCounters {
  if (!set || !progress) return { state: 'preparing' }
  const on = new Set(tiles)
  const inSet = new Set(set.species.filter((s) => on.has(s.tile)).map((s) => s.taxonId))
  const count = (ids: string[]) => ids.filter((id) => inSet.has(id)).length
  const seen = new Set(progress.seen.filter((id) => inSet.has(id)))
  return { state: 'ready', studied: count(progress.studied), seen: seen.size, both: progress.studied.filter((id) => seen.has(id)).length, possible: inSet.size }
}

export function useSetCounters(region: { id: string; status: string } | null): SetCounters {
  const { set, progress, tiles } = useAtlasSet(region)
  return countersOf(set, progress, tiles)
}

/** One bar, two axes (findings 0002 revision 2, doubt 19): green = entdeckt, amber = studiert but not yet entdeckt. */
export function CountersBar({ counters, className = '' }: { counters: SetCounters; className?: string }) {
  const ready = counters.state === 'ready'
  const possible = ready ? Math.max(counters.possible, 1) : 1
  // A first find is 0.1 % of 929: floor a non-zero segment at 2 % so the bar shows it at all.
  const pct = (n: number) => `${n > 0 ? Math.max(2, Math.min(100, Math.round((n / possible) * 100))) : 0}%`
  return (
    <div className={`flex h-3 overflow-hidden rounded-full bg-tile ${className}`} aria-hidden>
      {ready && (
        <>
          <span className="h-full bg-amber" style={{ width: pct(counters.studied - counters.both) }} />
          <span className="h-full bg-moss" style={{ width: pct(counters.seen) }} />
        </>
      )}
    </div>
  )
}
