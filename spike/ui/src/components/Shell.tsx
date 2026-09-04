import { useEffect, useRef, useState, type ReactNode } from 'react'
import { counters } from '../data'
import { GridToggle, Icon } from './Marks'

// Title row: page title and the grid · list · map toggle share one height (h-10).
// Under it, the two axes as one bar plus the counters inline. Region and month live in the filter drawer now.
export function Header({ title = 'Dein Dex', bump = false }: { title?: string; bump?: boolean }) {
  const seen = counters.seen + (bump ? 1 : 0)
  const studiedOnly = counters.studied - counters.both
  return (
    <header className="px-4 pt-3 pb-3">
      <div className="flex h-10 items-center justify-between">
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{title}</h1>
        <GridToggle />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-2.5 flex-1 gap-0.5 overflow-hidden rounded-full bg-tile" role="img" aria-label={`${seen} von ${counters.total} entdeckt, ${counters.studied} studiert`}>
          {studiedOnly > 0 && <div className="bg-amber" style={{ width: `${(studiedOnly / counters.total) * 100}%` }} />}
          <div className="bg-moss transition-[width] duration-500" style={{ width: `${(seen / counters.total) * 100}%` }} />
        </div>
        <p className="shrink-0 text-[13px] leading-none">
          <span className="font-semibold text-amber">{counters.studied} studiert</span>
          <span className="mx-1 text-ink-faint">·</span>
          <span className={`font-semibold text-moss-deep ${bump ? 'rounded-md bg-moss-soft px-1' : ''}`}>{seen} entdeckt</span>
          {bump && <span className="ml-1 rounded-full bg-moss px-1.5 text-[11px] font-bold text-white">+1</span>}
          <span className="mx-1 text-ink-faint">·</span>
          <span className="text-ink-soft">{counters.total} möglich</span>
        </p>
      </div>
    </header>
  )
}

export function FilterBar({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex gap-2 overflow-x-auto px-4 ${compact ? 'pb-2' : 'pb-3'} [scrollbar-width:none]`}>
      <button className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-paper">
        <span>📍</span> Mainz-Bingen <span className="opacity-60">· September</span>
      </button>
      <button className="flex shrink-0 items-center gap-1 rounded-full border border-ink/15 bg-card px-3 py-1.5 text-[13px]">
        🐦 🦌 🦋 🌿 🍄 🐸 🦎 <span className="text-ink-faint">alle</span>
      </button>
    </div>
  )
}

// Screen 6 · owner's drawing (2026-09-04): Dex · Quests · ＋ · Tagebuch · Du. Four destinations and the centred action.
// The bar is a white slab with rounded top corners; the ＋ sits with its centre exactly on the top edge, in a paper-coloured cradle.
export function BottomBar({ active = 'dex' }: { active?: string }) {
  const items = [
    { id: 'dex', label: 'Dex', icon: 'grid' },
    { id: 'quests', label: 'Quests', icon: 'quests' },
    { id: 'journal', label: 'Tagebuch', icon: 'journal' },
    { id: 'you', label: 'Du', icon: 'you' },
  ] as const
  const href: Record<string, string> = { dex: '#/grid/a', quests: '#/quests', journal: '#/journal', you: '#/you' }
  const Item = ({ it }: { it: (typeof items)[number] }) => (
    <a href={href[it.id]} className={`flex w-16 flex-col items-center gap-0.5 text-[11px] ${it.id === active ? 'font-semibold text-moss-deep' : 'text-ink-soft'}`}>
      <span className={`flex h-7 w-10 items-center justify-center rounded-full ${it.id === active ? 'bg-moss-soft' : ''}`}><Icon name={it.icon} size={20} /></span>
      {it.label}
    </a>
  )
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20">
      <div className="relative mx-auto max-w-[520px] rounded-t-3xl bg-card shadow-[0_-4px_24px_rgba(30,42,35,0.10)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <a href="#/log/chooser" aria-label="Eintragen" className="absolute top-0 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-moss text-[30px] leading-none text-white shadow-lg ring-[6px] ring-paper">＋</a>
        <div className="flex items-end justify-around px-2 pt-2.5 pb-2">
          <Item it={items[0]} /><Item it={items[1]} />
          <span className="w-14" aria-hidden />
          <Item it={items[2]} /><Item it={items[3]} />
        </div>
      </div>
    </nav>
  )
}

export function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-full max-w-[520px] pb-24">{children}</div>
}

const SearchField = ({ autoFocus = false }: { autoFocus?: boolean }) => (
  <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-card px-3 py-2.5 shadow-sm">
    <Icon name="search" size={18} className="text-ink-faint" />
    <input autoFocus={autoFocus} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-faint" placeholder="Art suchen · Amsel, Turdus …" />
  </div>
)

const Badge = ({ n }: { n: number }) => (n > 0 ? <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-moss px-1 text-[11px] font-semibold text-white ring-2 ring-paper">{n}</span> : null)

// Search + filter as one bar at the top of the grid. Scrolls away with the page; the FAB takes over.
export function SearchFilterBar({ count, onFilter }: { count: number; onFilter: () => void }) {
  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-card px-3 py-2 shadow-sm">
        <Icon name="search" size={18} className="text-ink-faint" />
        <input className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-faint" placeholder="Art suchen · Amsel, Turdus …" />
        <button onClick={onFilter} className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-tile text-ink" aria-label="Filter">
          <Icon name="sliders" size={18} />
          <Badge n={count} />
        </button>
      </div>
    </div>
  )
}

// Bottom-right "Suchen & Filter" button. Appears once the search bar has scrolled out of view. Sits above the bottom bar.
export function FilterFab({ count, visible, onClick }: { count: number; visible: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Suchen und filtern"
      className={`fixed right-4 bottom-[88px] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-lg transition-all duration-200 ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}
    >
      <Icon name="sliders" size={22} />
      <Badge n={count} />
    </button>
  )
}

// Watches an element; true once it has left the viewport upwards.
export function useScrolledPast<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [past, setPast] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return { ref, past }
}

export function FilterDrawer({ onClose, withSearch = false }: { onClose: () => void; withSearch?: boolean }) {
  const Chip = ({ on, children }: { on?: boolean; children: ReactNode }) => (
    <span className={`rounded-full px-3 py-1.5 text-[13px] ${on ? 'bg-moss/10 text-moss-deep ring-1 ring-moss font-medium' : 'bg-tile text-ink-soft'}`}>{children}</span>
  )
  const Row = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
    <section className="py-3">
      <div className="mb-2 flex items-baseline justify-between"><h3 className="text-[15px] font-semibold">{title}</h3>{hint && <span className="text-[12px] text-moss">{hint}</span>}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-paper px-4 pt-3 pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <div className="flex items-center justify-between"><h2 className="text-[20px] font-bold">{withSearch ? 'Suchen & Filter' : 'Filter'}</h2><button className="text-[13px] text-ink-soft">Zurücksetzen</button></div>
        {withSearch && <div className="mt-3"><SearchField /></div>}
        <Row title="📍 Region" hint="ändern"><Chip on>Mainz-Bingen · 25 km</Chip></Row>
        <Row title="🗓️ Zeitraum"><Chip on>Jetzt · September</Chip><Chip>Ganzes Jahr</Chip></Row>
        <Row title="Gruppen" hint="alle">
          {['🐦 Vögel', '🦌 Säugetiere', '🦋 Insekten', '🌿 Pflanzen', '🍄 Pilze', '🐸 Amphibien', '🦎 Reptilien'].map((g) => <Chip key={g} on>{g}</Chip>)}
        </Row>
        <Row title="Zeigen"><Chip on>Alle</Chip><Chip>Studiert</Chip><Chip>Entdeckt</Chip><Chip>Noch nicht entdeckt</Chip></Row>
        <Row title="Sortierung"><Chip on>Jetzt draußen zuerst</Chip><Chip>Nach Gruppe</Chip><Chip>A–Z</Chip></Row>
        <button onClick={onClose} className="mt-2 w-full rounded-2xl bg-moss py-3 text-[15px] font-semibold text-white">45 Arten anzeigen</button>
      </div>
    </div>
  )
}
