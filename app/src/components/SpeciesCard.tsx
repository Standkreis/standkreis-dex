'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export type Card = { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; lead: string | null }
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
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-tile ${state === 'seen' ? 'ring-2 ring-moss ring-inset' : state === 'studied' ? 'ring-2 ring-amber ring-inset' : ''}`} style={{ width: size, height: size }} aria-hidden>
      {card.lead && inSet ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser
        <img src={card.lead} alt="" loading="lazy" className={`h-full w-full object-cover ${cls}`} />
      ) : (
        <span className="text-ink-faint" style={{ fontSize: size * 0.45 }}>{inSet ? tileIcon[card.tile] ?? '?' : '?'}</span>
      )}
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

/** Ecology chip: thumb and name. Outside the set it is grey, says so, and leads nowhere (there is no page worth opening). */
export function EcologyChip({ card, state, inSet }: { card: Card; state: DexState; inSet: boolean }) {
  const name = useName()
  const t = useTranslations('species')
  const n = name(card)
  const label = n === card.sciName ? <i>{n}</i> : n
  if (!inSet)
    return (
      <span className="flex shrink-0 snap-start items-center gap-2 rounded-2xl bg-tile/60 py-1.5 pr-3 pl-1.5">
        <Thumb card={card} state="none" size={36} inSet={false} />
        <span className="min-w-0">
          <span className="block max-w-[160px] truncate text-[15px] leading-tight text-ink-soft">{label}</span>
          <span className="block text-[11px] leading-tight text-ink-faint">{t('notInAtlas')}</span>
        </span>
      </span>
    )
  return (
    <Link href={`/species/${card.gbifKey}`} className="flex shrink-0 snap-start items-center gap-2 rounded-2xl bg-card py-1.5 pr-3 pl-1.5 shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
      <Thumb card={card} state={state} size={36} />
      <span className="max-w-[180px] truncate text-[15px] leading-tight">{label}</span>
    </Link>
  )
}
