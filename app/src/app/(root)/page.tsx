'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { routing } from '@/i18n/routing'

// No middleware (static export, record Q5): the browser language picks de or en once, here.
export default function LocaleRedirect() {
  const router = useRouter()
  useEffect(() => {
    const wanted = navigator.language.slice(0, 2).toLowerCase()
    const locale = routing.locales.find((l) => l === wanted) ?? 'en'
    router.replace(`/${locale}`)
  }, [router])
  return null
}
