'use client'

import { useEffect } from 'react'
import { OfflineBanner } from './OfflineBanner'

// The build id rides on the worker URL (handoff 0009 Track A): a new build registers a new worker, which drops the old
// shell cache on activate. The browser fetches the worker script itself past the HTTP cache, so no header is needed.
export const SW_URL = `/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'}`

export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register(SW_URL, { scope: '/' }).catch(() => {})
  }, [])
  // The one place the layout mounts for the offline milestone: the banner rides along, so no page has to.
  return <OfflineBanner />
}
