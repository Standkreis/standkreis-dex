'use client'

import { useEffect } from 'react'
import { hashKey, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { flush, load, onFlushed, rowsNow, subscribe, type Row } from './Queue'

/**
 * Mounted once in the layout: runs the flush on `online`, on foreground, and every 60 s while rows wait; after a row
 * lands, the queries that show it are invalidated so the server's answer (its `first`, the Gemeinde, the photo) wins.
 * While rows wait, `identity.progress` is overlaid with their taxa, so a reload in the forest keeps the cells filled.
 */
export function QueueFlusher() {
  const qc = useQueryClient()
  const trpc = useTRPC()
  useEffect(() => {
    void load().then(() => flush())
    const online = () => void flush()
    const visible = () => { if (document.visibilityState === 'visible') void flush() }
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', visible)
    const timer = setInterval(() => { if (rowsNow().some((r) => !r.dead)) void flush() }, 60_000)
    return () => { window.removeEventListener('online', online); document.removeEventListener('visibilitychange', visible); clearInterval(timer) }
  }, [])

  useEffect(() => {
    const progressKey = trpc.identity.progress.queryKey()
    return onFlushed(async ({ row }) => {
      const keys = [progressKey, trpc.journal.pathKey()]
      if (row.kind === 'sighting') keys.push(trpc.sighting.photos.queryKey(), trpc.sighting.outside.pathKey(), trpc.sighting.fill.queryKey({ id: row.id }))
      await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey, refetchType: 'all' })))
    })
  }, [qc, trpc])

  // The overlay: whenever progress arrives from the server (or the persisted cache) while sightings wait, add their taxa.
  useEffect(() => {
    const progressKey = trpc.identity.progress.queryKey()
    const apply = () => {
      const waiting = rowsNow().filter((r): r is Row & { kind: 'sighting' } => r.kind === 'sighting' && !r.dead && r.payload.wildness === 'wild')
      if (!waiting.length) return
      qc.setQueryData(progressKey, (old) => {
        if (!old) return old
        const missing = waiting.filter((r) => !old.seen.includes(r.payload.taxonId))
        if (!missing.length) return old
        return { ...old, seen: [...old.seen, ...missing.map((r) => r.payload.taxonId)], seenAt: { ...old.seenAt, ...Object.fromEntries(missing.map((r) => [r.payload.taxonId, r.payload.at])) } }
      })
    }
    const unsub = qc.getQueryCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'success' && !e.action.manual && e.query.queryHash === hashKey(progressKey)) apply()
    })
    const unsubBox = subscribe(apply)
    apply()
    return () => { unsub(); unsubBox() }
  }, [qc, trpc])
  return null
}
