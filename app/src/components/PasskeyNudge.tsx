'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

// The one passkey nudge (doubt 31, handoff 0008 §❓): after the first wild sighting ever, once the fill sheet is gone.
// Shown once per browser: the flag is set on either button and on a dismiss, and never asked again. No banner elsewhere.
export const NUDGE_KEY = 'dex.nudge.passkey'
export const nudgeSeen = () => { try { return localStorage.getItem(NUDGE_KEY) === '1' } catch { return true } }
export const markNudge = () => { try { localStorage.setItem(NUDGE_KEY, '1') } catch { /* private mode: it will show again, nothing worse */ } }

export function PasskeyNudge({ onClose }: { onClose: () => void }) {
  const t = useTranslations('nudge')
  const router = useRouter()
  const close = () => { markNudge(); onClose() }
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={close} role="presentation">
      <div role="dialog" aria-modal aria-labelledby="nudge-title" data-testid="nudge"
        className="mx-auto w-full max-w-[520px] animate-[fill-up_320ms_ease-out] rounded-t-3xl bg-paper px-4 pt-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/20" />
        <h2 id="nudge-title" className="text-[22px] leading-tight font-bold tracking-tight"><span aria-hidden>🔑 </span>{t('title')}</h2>
        <p className="mt-2 text-[15px] leading-snug text-ink-soft">{t('body')}</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={close} className="flex h-13 flex-1 items-center justify-center rounded-full bg-tile text-[17px] font-bold" data-testid="nudge-later">{t('later')}</button>
          <button type="button" onClick={() => { markNudge(); onClose(); router.push('/settings') }} className="flex h-13 flex-[1.4] items-center justify-center rounded-full bg-moss text-[17px] font-bold text-white shadow-md" data-testid="nudge-create">{t('create')}</button>
        </div>
      </div>
    </div>
  )
}
