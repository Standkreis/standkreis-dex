'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { FilledIcon, Icon, type FilledIconName } from './Marks'
import { LogSheet } from './LogSheet'

// Spec §🎨 6: Atlas · Quests · ＋ · Tagebuch · Du. Four destinations and the centred action, which opens the chooser (spec §🎨 4).
// The bar is a card-coloured slab with rounded top corners; the ＋ sits with its centre on the top edge, in a paper-coloured cradle.
// No labels (handoff 0014 G3): active = the filled glyph in ink with a moss dot under it, inactive = the outline in ink-soft;
// the names stay as aria-labels.
const tabs = [
  { id: 'dex', href: '/', icon: 'grid' },
  { id: 'quests', href: '/quests', icon: 'quests' },
  { id: 'journal', href: '/journal', icon: 'journal' },
  { id: 'you', href: '/you', icon: 'you' },
] as const satisfies ReadonlyArray<{ id: string; href: string; icon: FilledIconName }>

function Tab({ tab }: { tab: (typeof tabs)[number] }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const active = pathname === tab.href || (tab.id === 'you' && pathname.startsWith('/settings'))
  return (
    <Link href={tab.href} aria-label={t(tab.id)} aria-current={active ? 'page' : undefined} data-testid={`tab-${tab.id}`} className={`flex h-12 w-16 flex-col items-center justify-center gap-1 ${active ? 'text-ink' : 'text-ink-soft'}`}>
      {active ? <FilledIcon name={tab.icon} size={24} /> : <Icon name={tab.icon} size={24} />}
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-moss' : 'bg-transparent'}`} aria-hidden />
    </Link>
  )
}

export function Shell() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [logOpen, setLogOpen] = useState(false)

  // Handoff 0013 O4: no bar under the onboarding. It was covered (z-30 over z-20) but Safari tints its own bar from the
  // bottom-most fixed element, so the card colour showed under the splash (findings 0013 C7).
  if (pathname === '/onboarding') return null
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20">
        <div className="relative mx-auto max-w-[520px] rounded-t-3xl bg-card shadow-[0_-4px_24px_rgba(30,42,35,0.10)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button type="button" onClick={() => setLogOpen(true)} aria-label={t('log')} className="absolute top-0 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-moss text-[30px] leading-none text-white shadow-lg ring-[6px] ring-paper">
            ＋
          </button>
          <div className="flex items-center justify-around px-2 pt-2 pb-1">
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
