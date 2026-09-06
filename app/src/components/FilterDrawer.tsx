'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { Tile } from '@/generated/prisma/enums'
import { Icon } from './Marks'
import { OfflineDownload } from './OfflineDownload'
import { OnboardingSilhouette } from './OnboardingSilhouette'
import { useDragDismiss } from './useDragDismiss'

export type Show = 'all' | 'studied' | 'seen' | 'new'
export type Sort = 'now' | 'name' | 'seen'
export const SHOWS: Show[] = ['all', 'studied', 'seen', 'new']
export const SORTS: Sort[] = ['now', 'name', 'seen']

export type DrawerState = {
  query: string
  regionName: string
  tiles: { tile: Tile; count: number }[]
  tilesOn: Set<Tile>
  show: Show
  sort: Sort
  nowOnly: boolean
  month: string
  results: number
}

type Props = DrawerState & {
  focusSearch?: boolean
  onClose: () => void
  onQuery: (q: string) => void
  onChangeRegion: () => void
  onToggleTile: (t: Tile) => void
  onShow: (s: Show) => void
  onSort: (s: Sort) => void
  onNowOnly: (on: boolean) => void
  onReset: () => void
}

// The bottom sheet of spec §🎨 2 (reference shot 0002-grid-a-filter-drawer): search on top, Region, Gruppen, Zeigen,
// Sortierung, the "nur jetzt" chip. No Zeitraum (record 0002 E2). Region and tiles persist through identity.setFilter,
// state, sort and the chip through the URL; the grid owns that, the drawer only reports taps.
export function FilterDrawer(p: Props) {
  const t = useTranslations('dex')
  const tt = useTranslations('dex.tile')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (p.focusSearch) input.current?.focus() }, [p.focusSearch])
  // G1: the handle and the title row pull the sheet down; the scrolling body keeps its scroll.
  const { sheet, dragProps, sheetStyle } = useDragDismiss(p.onClose)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') p.onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p])

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/40" onClick={p.onClose} role="presentation" data-testid="drawer">
      <div ref={sheet} role="dialog" aria-modal aria-labelledby="filter-title" onClick={(e) => e.stopPropagation()} style={sheetStyle}
        className="mx-auto flex max-h-[92vh] w-full max-w-[520px] flex-col rounded-t-3xl bg-paper">
        <div {...dragProps} className="shrink-0 cursor-grab px-4 pt-3 pb-1 select-none" data-testid="drawer-handle">
          <div className="mx-auto h-1 w-10 rounded-full bg-ink/20" />
          <div className="mt-4 flex items-center justify-between">
            <h2 id="filter-title" className="text-[24px] leading-none font-bold tracking-tight">{t('drawerTitle')}</h2>
            <button type="button" onClick={p.onReset} className="text-[15px] text-ink-soft" data-testid="reset">{t('reset')}</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          <label className="mt-2 flex h-12 items-center gap-3 rounded-2xl bg-card px-4 shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
            <Icon name="search" size={20} className="shrink-0 text-ink-faint" />
            <input ref={input} value={p.query} onChange={(e) => p.onQuery(e.target.value)} placeholder={t('search')} data-testid="drawer-search"
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-faint" />
          </label>

          <Section title={t('region')} aside={<button type="button" onClick={p.onChangeRegion} className="text-[15px] font-semibold text-moss-deep" data-testid="change-region">{t('change')}</button>}>
            <Chip on>{p.regionName}</Chip>
            <Chip on={p.nowOnly} onClick={() => p.onNowOnly(!p.nowOnly)} testId="now-only">{t('nowOnlyMonth', { month: p.month })}</Chip>
          </Section>

          <Section title={t('groups')}>
            {p.tiles.map(({ tile, count }) => {
              const on = p.tilesOn.has(tile)
              return (
                <Chip key={tile} on={on} onClick={() => p.onToggleTile(tile)} role="checkbox" checked={on} testId={`tile-${tile}`}>
                  <OnboardingSilhouette tile={tile} className="-ml-0.5 h-5 w-5 shrink-0" />
                  {tt(tile)}<span className={`ml-1 text-[13px] font-normal ${on ? 'text-sky-deep/70' : 'text-ink-faint'}`}>{count}</span>
                </Chip>
              )
            })}
          </Section>

          <Section title={t('show')}>
            {SHOWS.map((s) => (
              <Chip key={s} on={p.show === s} onClick={() => p.onShow(s)} role="radio" checked={p.show === s} testId={`show-${s}`}>{t(showKey[s])}</Chip>
            ))}
          </Section>

          <Section title={t('sort')}>
            {SORTS.map((s) => (
              <Chip key={s} on={p.sort === s} onClick={() => p.onSort(s)} role="radio" checked={p.sort === s} testId={`sort-${s}`}>{t(sortKey[s])}</Chip>
            ))}
          </Section>
          <div className="mt-4"><OfflineDownload testId="offline-download-drawer" /></div>
        </div>
        <div className="shrink-0 px-4 pt-2" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={p.onClose} data-testid="apply" className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white">{t('showN', { n: p.results })}</button>
        </div>
      </div>
    </div>
  )
}

const showKey = { all: 'showAll', studied: 'showStudied', seen: 'showSeen', new: 'showNew' } as const
const sortKey = { now: 'sortNow', name: 'sortName', seen: 'sortSeen' } as const

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-bold">{title}</h3>
        {aside}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </section>
  )
}

// One chip shape for region, tiles, states and sorts: sky outline on a faint sky ground when on (handoff 0014 G5: blue is
// selection, moss stays for the action button and "Ändern"), tile-grey when off.
function Chip({ on, onClick, role, checked, testId, children }: { on: boolean; onClick?: () => void; role?: 'checkbox' | 'radio'; checked?: boolean; testId?: string; children: React.ReactNode }) {
  const cls = `inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold ${on ? 'bg-sky-soft text-sky-deep ring-[1.5px] ring-sky ring-inset' : 'bg-tile text-ink-soft'}`
  if (!onClick) return <span className={cls}>{children}</span>
  return (
    <button type="button" onClick={onClick} role={role} aria-checked={role ? checked : undefined} aria-pressed={role ? undefined : on} data-testid={testId} className={cls}>
      {children}
    </button>
  )
}
