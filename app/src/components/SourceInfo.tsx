'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Icon } from './Marks'
import { useDragDismiss } from './useDragDismiss'

/**
 * One source or image credit as the ⓘ sheet renders it (handoff 0014 D3). `label` names the row when a sheet lists
 * several (a species name behind a thumb, a fact's label); `origin` is the human name of where it comes from, already
 * translated ("iNaturalist", "Wikipedia", "AnAge"); `sourceUrl` is the page it was taken from.
 */
export type Source = { label?: string | null; author?: string | null; licence?: string | null; licenceUrl?: string | null; origin?: string | null; sourceUrl?: string | null; note?: string | null }

/** The image-asset shape every router returns; `origin` is the raw key (inat · commons · user · …). */
export type ImageCredit = { author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string }

/** The human name of an asset's origin key. */
export function useOriginName() {
  const t = useTranslations('species')
  return (o: string) => (o === 'inat' || o === 'commons' || o === 'user' ? t(`origin.${o}`) : t('origin.other'))
}

/** An asset's credit as a `Source` row; user photos carry "Dein Foto" and no link (the source is the photo itself). */
export function useImageSource() {
  const origin = useOriginName()
  return (a: ImageCredit, label?: string | null): Source =>
    a.origin === 'user' ? { label, author: a.author, origin: origin('user') } : { label, author: a.author, licence: a.licence, licenceUrl: a.licenceUrl, origin: origin(a.origin), sourceUrl: a.sourceUrl }
}

/**
 * The ⓘ button (handoff 0014 D3): one small round glyph at every photo and source reference, tap opens the sheet with
 * licence, author and the source link. `tone` `card` floats over an image, `plain` sits in text, `glass` is for the
 * onboarding's dark screens. The button stops propagation, so it can sit next to a link without following it.
 */
export function SourceInfo({ title, sources, tone = 'plain', size = 28, className = '', testId = 'source-info' }: { title?: string; sources: Source[]; tone?: 'card' | 'plain' | 'glass'; size?: number; className?: string; testId?: string }) {
  const t = useTranslations('sourceInfo')
  const [open, setOpen] = useState(false)
  const look = tone === 'card' ? 'bg-card/90 text-ink shadow-md backdrop-blur' : tone === 'glass' ? 'bg-black/30 text-white/85 backdrop-blur' : 'text-ink-faint hover:text-ink-soft'
  return (
    <>
      <button type="button" aria-label={t('open')} aria-haspopup="dialog" data-testid={testId}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className={`inline-flex shrink-0 items-center justify-center rounded-full ${look} ${className}`} style={{ width: size, height: size }}>
        <Icon name="info" size={Math.round(size * 0.6)} />
      </button>
      {open && <SourceSheet title={title ?? t('title')} sources={sources} onClose={() => setOpen(false)} />}
    </>
  )
}

/** The sheet behind the ⓘ and behind a long-press on a slider image: author · licence · source per row, drag or tap outside to close. */
export function SourceSheet({ title, sources, onClose, children }: { title: string; sources: Source[]; onClose: () => void; children?: ReactNode }) {
  const t = useTranslations('species.attribution')
  const tc = useTranslations('common')
  const { sheet, dragProps, sheetStyle } = useDragDismiss(onClose)
  const link = (href: string | null | undefined, text: string) => (href ? <a href={href} target="_blank" rel="noreferrer" className="text-moss-deep underline" onClick={(e) => e.stopPropagation()}>{text}</a> : text)
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40" onClick={(e) => { e.stopPropagation(); onClose() }} role="presentation" data-testid="source-sheet">
      <div ref={sheet} role="dialog" aria-modal aria-labelledby="source-title" className="mx-auto flex max-h-[80vh] w-full max-w-[520px] flex-col rounded-t-3xl bg-paper text-ink" style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div {...dragProps} className="cursor-grab px-4 pt-3 select-none">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
          <div className="flex items-center justify-between">
            <h2 id="source-title" className="text-[20px] font-bold">{title}</h2>
            <button type="button" onClick={onClose} className="text-[13px] text-ink-soft">{tc('close')}</button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pt-3" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
          {sources.map((s, i) => (
            <div key={i} className={i > 0 ? 'mt-3 border-t border-tile pt-3' : ''} data-testid="source-row">
              {s.label && <div className="mb-1 text-[15px] font-semibold">{s.label}</div>}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
                {s.author && <><dt className="text-ink-soft">{t('author')}</dt><dd className="min-w-0 break-words">{s.author}</dd></>}
                {s.licence && <><dt className="text-ink-soft">{t('licence')}</dt><dd className="min-w-0 break-words">{link(s.licenceUrl, s.licence)}</dd></>}
                {(s.origin || s.sourceUrl) && <><dt className="text-ink-soft">{t('source')}</dt><dd className="min-w-0 break-words">{link(s.sourceUrl, s.origin ?? s.sourceUrl ?? '')}</dd></>}
              </dl>
              {s.note && <p className="mt-1 text-[13px] text-ink-faint">{s.note}</p>}
            </div>
          ))}
          {children}
        </div>
      </div>
    </div>
  )
}
