'use client'

import { useRef, useState, type PointerEvent } from 'react'
import { useTranslations } from 'next-intl'
import type { Tile } from '@/generated/prisma/enums'
import { useRouter } from '@/i18n/navigation'
import { OnboardingSilhouette } from './OnboardingSilhouette'
import { speciesOrigin } from './SpeciesOrigin'

export type Asset = { id: string; kind: string; url: string; author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string; caption: string | null }

const LONG_PRESS_MS = 500

/**
 * The image slider of spec §🎨 3 with attribution per view (spec §⚖️): one caption under the image at readable size,
 * author · licence · source on long-press (or a tap on the caption, which is the same sheet without the trick).
 * Scroll-snap, no library; the dots follow the scroll offset.
 */
export function SpeciesSlider({ assets, tile }: { assets: Asset[]; tile: string }) {
  const t = useTranslations('species')
  const tc = useTranslations('common')
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [sheet, setSheet] = useState<Asset | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const current = assets[index] ?? null

  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; start.current = null }
  const down = (a: Asset) => (e: PointerEvent) => {
    cancel()
    start.current = { x: e.clientX, y: e.clientY }
    timer.current = setTimeout(() => { timer.current = null; setSheet(a) }, LONG_PRESS_MS)
  }
  const move = (e: PointerEvent) => { if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel() }

  const origin = (o: string) => (o === 'inat' || o === 'commons' || o === 'user' ? t(`origin.${o}`) : t('origin.other'))
  // P4 (handoff 0014): not history.back(). Back goes to where the chain of species pages started, the atlas or the diary
  // (SpeciesOrigin), so a lookalike → lookalike hop never traps the reader between two pages.
  const back = () => router.push(speciesOrigin())

  return (
    <>
      <div className="relative">
        {assets.length ? (
          <div className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} data-testid="slider">
            {assets.map((a) => (
              // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser
              <img key={a.id} src={a.url} alt={a.caption ?? ''} draggable={false}
                className="h-full w-full shrink-0 snap-center object-cover select-none [-webkit-touch-callout:none]"
                onPointerDown={down(a)} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onPointerMove={move}
                onContextMenu={(e) => { e.preventDefault(); cancel(); setSheet(a) }} />
            ))}
          </div>
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-tile text-ink-faint">
            <OnboardingSilhouette tile={tile as Tile} className="h-16 w-16 opacity-50" />
            <span className="text-[13px]">{t('noImage')}</span>
          </div>
        )}
        <button type="button" onClick={back} aria-label={t('back')} className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-[20px] text-ink shadow-md backdrop-blur">
          <span aria-hidden className="-mt-0.5">‹</span>
        </button>
        {assets.length > 1 && (
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5" aria-hidden>
            {assets.map((a, i) => <span key={a.id} className={`h-1.5 rounded-full bg-white/90 shadow-sm transition-all ${i === index ? 'w-6' : 'w-1.5 opacity-70'}`} />)}
          </div>
        )}
      </div>
      {current && (
        <button type="button" onClick={() => setSheet(current)} className="mt-2 block w-full truncate px-4 text-left text-[13px] text-ink-faint" data-testid="caption">
          {current.origin === 'user' ? t('origin.user') : t('caption', { author: current.author, licence: current.licence, origin: origin(current.origin) })}
        </button>
      )}
      {sheet && (
        <div className="fixed inset-0 z-40 flex items-end bg-ink/40" onClick={() => setSheet(null)} role="presentation">
          <div role="dialog" aria-modal aria-labelledby="attribution-title" className="mx-auto w-full max-w-[520px] rounded-t-3xl bg-paper px-4 pt-3" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()} data-testid="attribution">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
            <div className="flex items-center justify-between">
              <h2 id="attribution-title" className="text-[20px] font-bold">{t('attribution.title')}</h2>
              <button type="button" onClick={() => setSheet(null)} className="text-[13px] text-ink-soft">{tc('close')}</button>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
              <dt className="text-ink-soft">{t('attribution.author')}</dt><dd className="min-w-0 break-words">{sheet.author}</dd>
              <dt className="text-ink-soft">{t('attribution.licence')}</dt>
              <dd className="min-w-0 break-words">{sheet.licenceUrl ? <a href={sheet.licenceUrl} target="_blank" rel="noreferrer" className="text-moss-deep underline">{sheet.licence}</a> : sheet.licence}</dd>
              <dt className="text-ink-soft">{t('attribution.source')}</dt>
              <dd className="min-w-0 break-words"><a href={sheet.sourceUrl} target="_blank" rel="noreferrer" className="text-moss-deep underline">{origin(sheet.origin)}</a></dd>
            </dl>
            <p className="mt-4 text-[12px] text-ink-faint">{t('attribution.hint')}</p>
          </div>
        </div>
      )}
    </>
  )
}
