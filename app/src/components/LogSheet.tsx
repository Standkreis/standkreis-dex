'use client'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { PhotoInput, queuedPhoto, type PhotoState } from './LogPhoto'
import { enqueueScan, noteUpload, uploadNoted } from './Scan'
import { Sheet, useSheetClose } from './Sheet'
import { SourceInfo } from './SourceInfo'

// The chooser (spec §🎨 4, record Q10): Foto · Galerie · Suchen, Suchen primary. Foto and Galerie take the picture first
// (resized and re-encoded on the device, uploaded unattached) and land on the search with `?photo=<id>&scan=1`, where the
// ladder sheet asks the engine (handoff 0016 B1–B3). Without signal the photo waits in the outbox and the sighting is an
// "unbestimmt" row next to it (B5).
export function LogSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations('log')
  return (
    <Sheet onClose={onClose} labelledBy="log-title" testId="chooser" handleTestId="chooser-handle" handle={<h2 id="log-title" className="mt-4 text-[13px] font-bold tracking-wide text-ink-soft uppercase">{t('title')}</h2>}>
      <LogTiles />
    </Sheet>
  )
}

/** The ⓘ behind the scan (B1, B6): engine, origin, the terms sentence. One definition, used by the chooser and the sighting. */
export function ScanInfo({ size = 24, className = '', testId = 'scan-info', note }: { size?: number; className?: string; testId?: string; note?: string | null }) {
  const ts = useTranslations('scan')
  return <SourceInfo title={ts('termsTitle')} sources={[{ label: ts('engine'), origin: ts('engineOrigin'), sourceUrl: 'https://www.anthropic.com/legal/commercial-terms', note: note ? `${note} · ${ts('terms')}` : ts('terms') }]} size={size} className={className} testId={testId} />
}

function LogTiles() {
  const t = useTranslations('log')
  const ts = useTranslations('scan')
  const tc = useTranslations('common')
  const router = useRouter()
  const trpc = useTRPC()
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<PhotoState>('idle')
  // B1: the terms sentence shows before the first upload ever, then only behind the ⓘ. The flag is set when the first photo goes up.
  const [noted, setNoted] = useState(uploadNoted)
  const me = useQuery(trpc.identity.me.queryOptions())
  const region = me.data?.region ?? null
  // G1: the handle and the title pull the sheet down; click-outside stays. 0014b: every close is the Sheet's animated one.
  const onClose = useSheetClose()
  const tile = 'flex flex-1 flex-col items-center gap-1 rounded-3xl py-5 shadow-[0_2px_12px_rgba(30,42,35,0.06)] disabled:opacity-60'
  const onState = (s: PhotoState) => { if (s === 'busy' && !noted) { noteUpload(); setNoted(true) }; setState(s) }
  const onPhoto = async (p: { id: string }) => {
    // Without signal the id is an outbox row: the sighting goes into the box as "unbestimmt" right here, the sheet then says so.
    if (queuedPhoto(p.id) && region) await enqueueScan({ photoRow: p.id, region })
    onClose()
    router.push(`/log?photo=${p.id}&scan=1`)
  }
  return (
    <div className="px-4" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      <p className="mt-2 flex items-center gap-1 text-[15px] leading-snug" data-testid="chooser-line">
        <span>{ts('photoLine')}</span>
        {noted && <ScanInfo className="-my-1" />}
      </p>
      <div className="mt-3 flex gap-3">
        <button type="button" onClick={() => camera.current?.click()} disabled={state === 'busy'} className={`${tile} bg-card`} data-testid="choose-photo">
          <span className="text-[34px] leading-none" aria-hidden>📷</span>
          <span className="mt-2 text-[17px] font-bold">{t('photo')}</span>
          <span className="text-[13px] text-ink-soft">{t('photoSub')}</span>
        </button>
        <button type="button" onClick={() => gallery.current?.click()} disabled={state === 'busy'} className={`${tile} bg-card`} data-testid="choose-gallery">
          <span className="text-[34px] leading-none" aria-hidden>🖼️</span>
          <span className="mt-2 text-[17px] font-bold">{t('gallery')}</span>
          <span className="text-[13px] text-ink-soft">{t('gallerySub')}</span>
        </button>
        <button type="button" onClick={() => { onClose(); router.push('/log') }} className={`${tile} bg-moss text-white`} data-testid="choose-search">
          <span className="text-[34px] leading-none" aria-hidden>🔍</span>
          <span className="mt-2 text-[17px] font-bold">{t('search')}</span>
          <span className="text-[13px] text-white/80">{t('searchSub')}</span>
        </button>
      </div>
      <PhotoInput ref={camera} source="camera" onPhoto={onPhoto} onState={onState} testId="photo-input-camera" />
      <PhotoInput ref={gallery} source="gallery" onPhoto={onPhoto} onState={onState} testId="photo-input-gallery" />
      {state === 'busy' ? (
        <p className="mt-4 text-[13px] leading-snug text-ink-soft" data-testid="chooser-note">{t('photoUploading')}</p>
      ) : state === 'error' ? (
        <p className="mt-4 text-[13px] leading-snug text-amber" data-testid="chooser-note">{tc('error')}</p>
      ) : !noted ? (
        <p className="mt-4 flex items-start gap-1 text-[13px] leading-snug text-ink-soft" data-testid="chooser-note" data-first="1">
          <span>{ts('terms')}</span>
          <ScanInfo className="-my-0.5" />
        </p>
      ) : null}
    </div>
  )
}
