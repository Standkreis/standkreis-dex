'use client'

import { useEffect } from 'react'

// Registration point for M8 (offline). The worker exists and caches nothing yet.
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [])
  return null
}
