'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { PhotoInput, photoSrc, type Photo, type PhotoState } from './LogPhoto'
import { tileIcon } from './SpeciesCard'

type Fill = {
  id: string
  at: Date
  place: string | null
  photo: { id: string; url: string } | null
  taxon: { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; lead: { url: string; author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string } | null }
}

/**
 * The compact sheet of the fill moment (spec §🎨 5, findings 0002 F3 revised): what was saved in one row, the
 * reference-image attribution when no own photo fills the cell, "Foto" only when none is attached, "Zur Art ›".
 * No acknowledge button: a tap on the grid or a swipe down dismisses it. No confetti, no XP.
 */
export function FillSheet({ s, onClose, onPhoto, photoState }: { s: Fill; onClose: () => void; onPhoto: (p: Photo) => void; photoState: PhotoState }) {
  const t = useTranslations('fill')
  const ts = useTranslations('species')
  const tc = useTranslations('common')
  const locale = useLocale()
  const format = useFormatter()
  const picker = useRef<HTMLInputElement>(null)
  const [picking, setPicking] = useState<PhotoState>('idle')
  const busy = picking === 'busy' || photoState === 'busy'
  const failed = picking === 'error' || photoState === 'error'
  const name = s.taxon.names[locale] ?? s.taxon.names.de ?? s.taxon.names.en ?? s.taxon.sciName
  const image = s.photo ? photoSrc(s.photo.url) : s.taxon.lead?.url ?? null
  const origin = s.taxon.lead ? (ts.has(`origin.${s.taxon.lead.origin}`) ? ts(`origin.${s.taxon.lead.origin}`) : s.taxon.lead.origin) : ''
  const startY = useRef<number | null>(null)
  return (
    <div className="fixed inset-0 z-30 flex items-end" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal aria-label={t('label')} data-testid="fill-sheet"
        className="mx-auto w-full max-w-[520px] animate-[fill-up_320ms_ease-out] rounded-t-3xl bg-paper px-4 pt-3 shadow-[0_-8px_32px_rgba(30,42,35,0.18)]"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => (startY.current = e.clientY)}
        onPointerUp={(e) => { if (startY.current !== null && e.clientY - startY.current > 60) onClose(); startY.current = null }}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/20" />
        <Link href={`/species/${s.taxon.gbifKey}`} className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-tile ring-[3px] ring-moss" aria-hidden>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote hosts, no optimiser
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[28px] text-ink-faint">{tileIcon[s.taxon.tile] ?? '?'}</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold tracking-wide text-moss-deep uppercase">{t('label')}</span>
            <span className="block truncate text-[24px] leading-tight font-bold" data-testid="fill-name">{name}</span>
            <span className="mt-0.5 block text-[15px] leading-snug text-ink-soft" data-testid="fill-meta">
              <span aria-hidden>👁 </span>{t('meta', { date: format.dateTime(s.at, { day: 'numeric', month: 'short' }), place: s.place ?? '' })}
            </span>
          </span>
          <span className="shrink-0 text-[22px] text-ink-faint" aria-hidden>›</span>
        </Link>
        {!s.photo && s.taxon.lead && (
          <p className="mt-3 text-[13px] leading-snug text-ink-faint" data-testid="fill-attribution">
            {t('reference', { author: s.taxon.lead.author, licence: s.taxon.lead.licence, origin })}
          </p>
        )}
        <div className="mt-4 flex gap-3">
          {!s.photo && (
            <button type="button" onClick={() => picker.current?.click()} disabled={busy} className={`flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-tile text-[17px] font-bold disabled:opacity-60 ${failed ? 'text-amber' : ''}`} data-testid="fill-photo">
              <span aria-hidden>📷</span> {busy ? tc('working') : failed ? tc('error') : t('photo')}
            </button>
          )}
          {!s.photo && <PhotoInput ref={picker} source="gallery" onPhoto={onPhoto} onState={setPicking} testId="photo-input" />}
          <Link href={`/species/${s.taxon.gbifKey}`} className="flex h-13 flex-[1.4] items-center justify-center rounded-full bg-moss text-[17px] font-bold text-white shadow-md" data-testid="fill-species">
            {t('toSpecies')}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** The quiet toast (doubt 12): one line above the bar, gone after three seconds, nothing else moves. */
export function Toast({ text, onDone, children }: { text: string; onDone: () => void; children?: ReactNode }) {
  const [shown, setShown] = useState(true)
  useEffect(() => { const h = setTimeout(() => { setShown(false); onDone() }, 3000); return () => clearTimeout(h) }, [onDone]) // the caller keeps onDone stable
  if (!shown) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }} role="status" data-testid="toast">
      <span className="animate-[fill-up_240ms_ease-out] rounded-full bg-ink px-4 py-2.5 text-[15px] font-semibold text-paper shadow-lg">{text}{children}</span>
    </div>
  )
}
