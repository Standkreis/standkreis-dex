'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

// The chooser (spec §🎨 4, record Q10): Foto · Galerie · Suchen, Suchen primary. Foto and Galerie take the picture
// first and land on the same search; until the photo path exists (handoff 0008, second half) they say so in one line.
export function LogSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations('log')
  const router = useRouter()
  const [soon, setSoon] = useState(false)
  const tile = 'flex flex-1 flex-col items-center gap-1 rounded-3xl py-5 shadow-[0_2px_12px_rgba(30,42,35,0.06)]'
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose} role="presentation" data-testid="chooser">
      <div role="dialog" aria-modal aria-labelledby="log-title" className="mx-auto w-full max-w-[520px] rounded-t-3xl bg-paper px-4 pt-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/20" />
        <h2 id="log-title" className="text-[13px] font-bold tracking-wide text-ink-soft uppercase">{t('title')}</h2>
        <div className="mt-3 flex gap-3">
          <button type="button" onClick={() => setSoon(true)} className={`${tile} bg-card`} data-testid="choose-photo">
            <span className="text-[34px] leading-none" aria-hidden>📷</span>
            <span className="mt-2 text-[17px] font-bold">{t('photo')}</span>
            <span className="text-[13px] text-ink-soft">{t('photoSub')}</span>
          </button>
          <button type="button" onClick={() => setSoon(true)} className={`${tile} bg-card`} data-testid="choose-gallery">
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
        <p className="mt-4 text-[13px] leading-snug text-ink-soft">{soon ? t('photoSoon') : t('photoNote')}</p>
      </div>
    </div>
  )
}
