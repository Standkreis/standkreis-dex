'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { Icon, type IconName } from './Marks'
import { LogSheet } from './LogSheet'

// Spec §🎨 6: Atlas · Quests · ＋ · Tagebuch · Du. Four destinations and the centred action.
// The bar is a card-coloured slab with rounded top corners; the ＋ sits with its centre on the top edge, in a paper-coloured cradle.
const tabs = [
  { id: 'dex', href: '/', icon: 'grid' },
  { id: 'quests', href: '/quests', icon: 'quests' },
  { id: 'journal', href: '/journal', icon: 'journal' },
  { id: 'you', href: '/you', icon: 'you' },
] as const satisfies ReadonlyArray<{ id: string; href: string; icon: IconName }>

function Tab({ tab }: { tab: (typeof tabs)[number] }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const active = pathname === tab.href || (tab.id === 'you' && pathname.startsWith('/settings'))
  return (
    <Link href={tab.href} aria-current={active ? 'page' : undefined} className={`flex w-16 flex-col items-center gap-0.5 text-[11px] ${active ? 'font-semibold text-moss-deep' : 'text-ink-soft'}`}>
      <span className={`flex h-7 w-10 items-center justify-center rounded-full ${active ? 'bg-moss-soft' : ''}`}><Icon name={tab.icon} size={20} /></span>
      {t(tab.id)}
    </Link>
  )
}

export function Shell() {
  const t = useTranslations('nav')
  const [logOpen, setLogOpen] = useState(false)

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20">
        <div className="relative mx-auto max-w-[520px] rounded-t-3xl bg-card shadow-[0_-4px_24px_rgba(30,42,35,0.10)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button type="button" onClick={() => setLogOpen(true)} aria-label={t('log')} className="absolute top-0 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-moss text-[30px] leading-none text-white shadow-lg ring-[6px] ring-paper">
            ＋
          </button>
          <div className="flex items-end justify-around px-2 pt-2.5 pb-2">
            <Tab tab={tabs[0]} /><Tab tab={tabs[1]} />
            <span className="w-14" aria-hidden />
            <Tab tab={tabs[2]} /><Tab tab={tabs[3]} />
          </div>
        </div>
      </nav>
      {logOpen && <LogSheet onClose={() => setLogOpen(false)} />}
    </>
  )
}
