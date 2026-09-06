'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { FilledIcon, Icon, type FilledIconName } from './Marks'
import { LogSheet } from './LogSheet'

// Spec §🎨 6: Atlas · Quests · ＋ · Tagebuch · Du. Four destinations and the centred action, which opens the chooser (spec §🎨 4).
// The bar is a card-coloured slab with rounded top corners; the ＋ sits with its centre on the top edge, in a paper-coloured cradle.
// No labels (handoff 0014 G3): active = the filled glyph in ink with a moss dot under it, inactive = the outline in ink-soft;
// the names stay as aria-labels. Handoff 0014b A3: outline and filled glyph are stacked and cross-fade (globals.css `.tab-glyph`);
// the moss dot is one element in the row that slides to the active tab's placeholder (`.tab-dot`, measured in a layout effect).
const tabs = [
  { id: 'dex', href: '/', icon: 'grid' },
  { id: 'quests', href: '/quests', icon: 'quests' },
  { id: 'journal', href: '/journal', icon: 'journal' },
  { id: 'you', href: '/you', icon: 'you' },
] as const satisfies ReadonlyArray<{ id: string; href: string; icon: FilledIconName }>

const isActive = (tab: (typeof tabs)[number], pathname: string) => pathname === tab.href || (tab.id === 'you' && pathname.startsWith('/settings'))

function Tab({ tab, active }: { tab: (typeof tabs)[number]; active: boolean }) {
  const t = useTranslations('nav')
  return (
    <Link href={tab.href} aria-label={t(tab.id)} aria-current={active ? 'page' : undefined} data-testid={`tab-${tab.id}`} className={`motion-toggle flex h-12 w-16 flex-col items-center justify-center gap-1 ${active ? 'text-ink' : 'text-ink-soft'}`}>
      <span className="grid size-6 place-items-center">
        <span className="tab-glyph col-start-1 row-start-1 flex" data-on={!active}><Icon name={tab.icon} size={24} /></span>
        <span className="tab-glyph tab-fill col-start-1 row-start-1 flex" data-on={active}><FilledIcon name={tab.icon} size={24} /></span>
      </span>
      <span className="h-1.5 w-1.5" aria-hidden data-dot-slot />
    </Link>
  )
}

/** The moss dot: one element in the row, translated to the active tab's slot; hidden (and left where it was) on routes without
 *  a tab. It measures from its own ref (the parent's ref is not attached yet when a child's layout effect runs on mount). */
function Dot({ pathname }: { pathname: string }) {
  const el = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const active = tabs.find((t) => isActive(t, pathname))
  useLayoutEffect(() => {
    const row = el.current?.parentElement
    const measure = () => {
      const slot = row?.querySelector<HTMLElement>(`[data-testid=tab-${active?.id}] [data-dot-slot]`)
      if (!row || !slot) return
      const a = slot.getBoundingClientRect(), b = row.getBoundingClientRect()
      setPos({ x: a.left - b.left, y: a.top - b.top })
    }
    measure()
    if (!row) return
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    return () => ro.disconnect()
  }, [active?.id])
  return <span ref={el} className="tab-dot absolute top-0 left-0 h-1.5 w-1.5 rounded-full bg-moss" style={{ transform: `translate(${pos?.x ?? 0}px, ${pos?.y ?? 0}px)`, opacity: active && pos ? 1 : 0 }} aria-hidden data-testid="tab-dot" />
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
          <div className="relative flex items-center justify-around px-2 pt-2 pb-1">
            <Tab tab={tabs[0]} active={isActive(tabs[0], pathname)} /><Tab tab={tabs[1]} active={isActive(tabs[1], pathname)} />
            <span className="w-14" aria-hidden />
            <Tab tab={tabs[2]} active={isActive(tabs[2], pathname)} /><Tab tab={tabs[3]} active={isActive(tabs[3], pathname)} />
            <Dot pathname={pathname} />
          </div>
        </div>
      </nav>
      {logOpen && <LogSheet onClose={() => setLogOpen(false)} />}
    </>
  )
}
