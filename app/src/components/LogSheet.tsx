'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { PhotoInput, type PhotoState } from './LogPhoto'
import { Sheet, useSheetClose } from './Sheet'

// The chooser (spec §🎨 4, record Q10): Foto · Galerie · Suchen, Suchen primary. Foto and Galerie take the picture first
// (resized and re-encoded on the device, uploaded unattached) and land on the same search with `?photo=<id>`.
export function LogSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations('log')
  return (
    <Sheet onClose={onClose} labelledBy="log-title" testId="chooser" handleTestId="chooser-handle" handle={<h2 id="log-title" className="mt-4 text-[13px] font-bold tracking-wide text-ink-soft uppercase">{t('title')}</h2>}>
      <LogTiles />
    </Sheet>
  )
}

function LogTiles() {
  const t = useTranslations('log')
  const tc = useTranslations('common')
  const router = useRouter()
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<PhotoState>('idle')
  // G1: the handle and the title pull the sheet down; click-outside stays. 0014b: every close is the Sheet's animated one.
  const onClose = useSheetClose()
  const tile = 'flex flex-1 flex-col items-center gap-1 rounded-3xl py-5 shadow-[0_2px_12px_rgba(30,42,35,0.06)] disabled:opacity-60'
  const onPhoto = (p: { id: string }) => { onClose(); router.push(`/log?photo=${p.id}`) }
  return (
    <div className="px-4" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
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
      <PhotoInput ref={camera} source="camera" onPhoto={onPhoto} onState={setState} testId="photo-input-camera" />
      <PhotoInput ref={gallery} source="gallery" onPhoto={onPhoto} onState={setState} testId="photo-input-gallery" />
      <p className={`mt-4 text-[13px] leading-snug ${state === 'error' ? 'text-amber' : 'text-ink-soft'}`} data-testid="chooser-note">
        {state === 'busy' ? t('photoUploading') : state === 'error' ? tc('error') : t('photoNote')}
      </p>
    </div>
  )
}
