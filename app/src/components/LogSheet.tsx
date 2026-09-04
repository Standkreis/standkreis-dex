'use client'

import { useTranslations } from 'next-intl'

// Placeholder for the chooser (spec §🎨 4, built in M6). Proves the ＋ is an action, not a tab.
export function LogSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations()
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal aria-labelledby="log-title" className="w-full rounded-t-3xl bg-paper px-4 pt-3 pb-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <div className="flex items-center justify-between">
          <h2 id="log-title" className="text-[20px] font-bold">{t('log.title')}</h2>
          <button type="button" onClick={onClose} className="text-[13px] text-ink-soft">{t('common.close')}</button>
        </div>
        <p className="mt-2 text-[15px] text-ink-soft">{t('common.comingSoon')}</p>
      </div>
    </div>
  )
}
