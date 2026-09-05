'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { isNetworkError } from '@/trpc/client'

// One offline flag for the whole app (handoff 0009 Track A): `navigator.onLine` says the radio is off, a query or
// mutation failing with a network error says the server is out of reach (airplane mode with Wi-Fi assist, a dead
// zone the phone still calls "online"). Any successful fetch clears it.
let offline = false
const listeners = new Set<() => void>()
const setOffline = (on: boolean) => { if (on === offline) return; offline = on; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const useOffline = () => useSyncExternalStore(subscribe, () => offline, () => false)

/** The one-line banner under the header: nothing blocks, nothing spins. Mounted once from ServiceWorker.tsx. */
export function OfflineBanner() {
  const t = useTranslations('offline')
  const qc = useQueryClient()
  const off = useOffline()

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    const onEvent = (e: { type: string; action?: { type: string; error?: unknown } }) => {
      if (e.type !== 'updated' || !e.action) return
      if (e.action.type === 'error' && isNetworkError(e.action.error)) setOffline(true)
      else if (e.action.type === 'success') setOffline(!navigator.onLine)
    }
    const unsubQ = qc.getQueryCache().subscribe(onEvent)
    const unsubM = qc.getMutationCache().subscribe(onEvent)
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); unsubQ(); unsubM() }
  }, [qc])

  // The pages own their headers, so the strip sits fixed at the top and the body makes room for it while it shows.
  useEffect(() => {
    document.body.style.paddingTop = off ? 'var(--offline-h, 36px)' : ''
    return () => { document.body.style.paddingTop = '' }
  }, [off])

  if (!off) return null
  return (
    <div role="status" data-testid="offline-banner" className="fixed inset-x-0 top-0 z-30 flex justify-center bg-amber-soft text-amber" style={{ height: 'var(--offline-h, 36px)', paddingTop: 'env(safe-area-inset-top)' }}>
      <p className="mx-auto flex w-full max-w-[520px] items-center gap-2 truncate px-4 text-[13px] font-semibold"><span aria-hidden>📴</span><span className="truncate">{t('banner')}</span></p>
    </div>
  )
}
