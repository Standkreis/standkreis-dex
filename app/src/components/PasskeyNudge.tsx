'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Sheet, useSheetClose } from './Sheet'

// The one passkey nudge (doubt 31, handoff 0008 §❓): after the first wild sighting ever, once the fill sheet is gone.
// Shown once per browser: the flag is set on either button and on a dismiss, and never asked again. No banner elsewhere.
export const NUDGE_KEY = 'dex.nudge.passkey'
export const nudgeSeen = () => { try { return localStorage.getItem(NUDGE_KEY) === '1' } catch { return true } }
export const markNudge = () => { try { localStorage.setItem(NUDGE_KEY, '1') } catch { /* private mode: it will show again, nothing worse */ } }

export function PasskeyNudge({ onClose }: { onClose: () => void }) {
  // The flag is set when the sheet unmounts, whichever way it went (button, tap outside, drag, Escape).
  return (
    <Sheet onClose={() => { markNudge(); onClose() }} labelledBy="nudge-title" testId="nudge">
      <NudgeBody />
    </Sheet>
  )
}

function NudgeBody() {
  const t = useTranslations('nudge')
  const router = useRouter()
  const close = useSheetClose()
  return (
    <div className="px-4" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      <h2 id="nudge-title" className="mt-4 text-[22px] leading-tight font-bold tracking-tight"><span aria-hidden>🔑 </span>{t('title')}</h2>
      <p className="mt-2 text-[15px] leading-snug text-ink-soft">{t('body')}</p>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={close} className="flex h-13 flex-1 items-center justify-center rounded-full bg-tile text-[17px] font-bold" data-testid="nudge-later">{t('later')}</button>
        <button type="button" onClick={() => { close(); router.push('/settings') }} className="flex h-13 flex-[1.4] items-center justify-center rounded-full bg-moss text-[17px] font-bold text-white shadow-md" data-testid="nudge-create">{t('create')}</button>
      </div>
    </div>
  )
}
