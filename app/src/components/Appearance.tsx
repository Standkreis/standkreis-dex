'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

// Darstellung: theme and language, local to the device (localStorage), never synced. Default: follow the system.
// The owner overruled doubt 34 on 2026-09-05: the system stays the default, the choice belongs in Einstellungen.
export const THEME_KEY = 'dex_theme'
export const LOCALE_KEY = 'dex_locale'
export type Theme = 'system' | 'light' | 'dark'
const themes: Theme[] = ['system', 'light', 'dark']

// Runs before paint in <head>: resolves the stored choice to data-theme so there is no flash. Kept in sync below.
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}})()`

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
function subscribeTheme(l: () => void) {
  listeners.add(l)
  window.addEventListener('storage', l)
  return () => { listeners.delete(l); window.removeEventListener('storage', l) }
}
export function readTheme(): Theme {
  try { const t = localStorage.getItem(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'system' } catch { return 'system' }
}
export function applyTheme(theme: Theme) {
  try { if (theme === 'system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, theme) } catch { /* private mode */ }
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

// Rendered once per locale layout: a client-side locale switch re-renders <html>, which drops data-theme; re-apply it.
export function ThemeBoot() {
  useEffect(() => { applyTheme(readTheme()) }, [])
  return null
}

function Segmented<T extends string>({ value, options, onChange, label, testId }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; testId: string }) {
  return (
    <div role="radiogroup" aria-label={label} data-testid={testId} className="flex shrink-0 rounded-full bg-tile p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${value === o.value ? 'bg-card text-ink shadow-[0_1px_4px_rgba(30,42,35,0.12)]' : 'text-ink-soft'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

const localeLabel: Record<Locale, string> = { de: 'Deutsch', en: 'English' }

export function AppearanceRows() {
  const t = useTranslations('settings.display')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  // localStorage is an external store: the server snapshot is 'system', the client reads the stored choice.
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'system' as Theme)

  const pick = (next: Theme) => { applyTheme(next); notify() }
  const switchLocale = (next: Locale) => {
    try { localStorage.setItem(LOCALE_KEY, next) } catch { /* private mode */ }
    router.replace(pathname, { locale: next })
  }
  const row = 'flex items-center gap-3 px-4 py-3.5'
  return (
    <>
      <div className={row}>
        <div className="min-w-0 flex-1 text-[17px]">{t('theme')}</div>
        <Segmented value={theme} onChange={pick} label={t('theme')} testId="theme"
          options={themes.map((v) => ({ value: v, label: t(v === 'system' ? 'themeSystem' : v === 'light' ? 'themeLight' : 'themeDark') }))} />
      </div>
      <div className={row}>
        <div className="min-w-0 flex-1 text-[17px]">{t('language')}</div>
        <Segmented value={locale} onChange={switchLocale} label={t('language')} testId="language"
          options={routing.locales.map((l) => ({ value: l, label: localeLabel[l] }))} />
      </div>
    </>
  )
}
