'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { ImageCredit } from './SourceInfo'

/** `leadInfo` is the lead image's credit for the section's ⓘ sheet (handoff 0014 D3); the diary's rows do not carry it. */
export type Card = { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; lead: string | null; leadInfo?: ImageCredit | null }
export type DexState = 'none' | 'studied' | 'seen'

export const tileIcon: Record<string, string> = { bird: '🐦', mammal: '🦌', amphibian: '🐸', reptile: '🦎', fish: '🐟', insect: '🦋', plant: '🌿', fungus: '🍄' }

/** The name in the reader's language, else German, else English, else Latin. */
export function useName() {
  const locale = useLocale()
  return (c: { names: Record<string, string>; sciName: string }) => c.names[locale] ?? c.names.de ?? c.names.en ?? c.sciName
}

/** The mini tile of findings 0002 §🏷️: no badge, the image tells the state (grey · grey with amber ring · colour with moss ring, handoff 0014 G4). */
export function Thumb({ card, state, size, inSet = true }: { card: Card; state: DexState; size: number; inSet?: boolean }) {
  const cls = state === 'seen' ? '' : state === 'studied' ? 'opacity-70 grayscale' : 'opacity-45 grayscale'
  return (
    <span className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-tile" style={{ width: size, height: size }} aria-hidden>
      {card.lead && inSet ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser
        <img src={card.lead} alt="" loading="lazy" className={`h-full w-full object-cover ${cls}`} />
      ) : (
        <span className="text-ink-faint" style={{ fontSize: size * 0.45 }}>{inSet ? tileIcon[card.tile] ?? '?' : '?'}</span>
      )}
      {state !== 'none' && <span className={`motion-ring pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset ${state === 'seen' ? 'ring-moss' : 'ring-amber'}`} />}
    </span>
  )
}

/** Look-alike card: thumb, name, Latin name. Always a set member (same genus within the set, record 0002 E10), so always a link. */
export function LookalikeCard({ card, state }: { card: Card; state: DexState }) {
  const name = useName()
  const t = useTranslations('species.lookalikes')
  const n = name(card)
  return (
    <Link href={`/species/${card.gbifKey}`} className="flex w-[210px] shrink-0 snap-start items-center gap-3 rounded-2xl bg-card px-3 py-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
      <Thumb card={card} state={state} size={44} />
      <span className="min-w-0">
        <span className="line-clamp-2 block text-[15px] leading-tight font-semibold">{n}</span>
        <span className="mt-0.5 block truncate text-[12px] leading-tight text-ink-soft">{n === card.sciName ? t('sameGenus') : <i>{card.sciName}</i>}</span>
      </span>
    </Link>
  )
}

/** Ecology chip: thumb and name, one item of the wrapping `ChipGrid` (handoff 0014 D4). Outside the set it is grey, says so, and leads nowhere (there is no page worth opening). */
export function EcologyChip({ card, state, inSet }: { card: Card; state: DexState; inSet: boolean }) {
  const name = useName()
  const t = useTranslations('species')
  const n = name(card)
  const label = n === card.sciName ? <i>{n}</i> : n
  if (!inSet)
    return (
      <span className="flex min-w-0 items-center gap-2 rounded-2xl bg-tile/60 py-1.5 pr-2.5 pl-1.5">
        <Thumb card={card} state="none" size={36} inSet={false} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] leading-tight text-ink-soft">{label}</span>
          <span className="block truncate text-[11px] leading-tight text-ink-faint">{t('notInAtlas')}</span>
        </span>
      </span>
    )
  return (
    <Link href={`/species/${card.gbifKey}`} className="flex min-w-0 items-center gap-2 rounded-2xl bg-card py-1.5 pr-2.5 pl-1.5 shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
      <Thumb card={card} state={state} size={36} />
      <span className="line-clamp-2 min-w-0 text-[14px] leading-tight">{label}</span>
    </Link>
  )
}

export const CHIP_ROWS = 3

/**
 * A chip grid that shows three rows and folds the rest behind "mehr anzeigen" (handoff 0014 D4). Two columns at phone
 * width (a chip with a 36 px thumb and a readable name needs ~175 px; three columns would truncate every second name),
 * three from 480 px. Rows are measured, not counted: "three rows" is read off `offsetTop` after layout (before paint,
 * `useLayoutEffect`), so a column change is free. A width change re-measures with every chip rendered once, then folds again.
 */
export function ChipGrid({ items, more, less, testId }: { items: ReactNode[]; more: (n: number) => string; less: string; testId?: string }) {
  const grid = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [fit, setFit] = useState<number | null>(null) // chips inside the first CHIP_ROWS rows; null = not measured yet
  const measured = fit !== null
  useLayoutEffect(() => {
    const el = grid.current
    if (!el) return
    const measure = () => {
      const kids = [...el.children] as HTMLElement[]
      const rows = [...new Set(kids.map((k) => k.offsetTop))].sort((a, b) => a - b)
      const limit = rows[CHIP_ROWS]
      setFit(limit === undefined ? kids.length : kids.findIndex((k) => k.offsetTop >= limit))
    }
    if (!measured) { measure(); return }
    let width = el.clientWidth
    const ro = new ResizeObserver(() => { if (el.clientWidth !== width) { width = el.clientWidth; setFit(null) } })
    ro.observe(el)
    return () => ro.disconnect()
  }, [measured, items.length])
  const shown = !measured || open || fit >= items.length ? items : items.slice(0, fit)
  const hidden = measured ? items.length - fit : 0
  return (
    <>
      <div ref={grid} className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3" data-testid={testId} data-rows={measured ? CHIP_ROWS : undefined}>{shown}</div>
      {hidden > 0 && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mt-2 text-[15px] font-semibold text-moss-deep" data-testid={testId ? `${testId}-toggle` : undefined}>
          {open ? less : more(hidden)}
        </button>
      )}
    </>
  )
}
