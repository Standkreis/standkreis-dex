'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { LOCALE_KEY } from '@/components/Appearance'

// No middleware (static export, record Q5): the browser language picks de or en once, here.
export default function LocaleRedirect() {
  const router = useRouter()
  useEffect(() => {
    // A language chosen in Einstellungen wins over the browser language.
    let stored: string | null = null
    try { stored = localStorage.getItem(LOCALE_KEY) } catch { /* private mode */ }
    const wanted = stored ?? navigator.language.slice(0, 2).toLowerCase()
    const locale = routing.locales.find((l) => l === wanted) ?? 'en'
    router.replace(`/${locale}`)
  }, [router])
  return null
}
