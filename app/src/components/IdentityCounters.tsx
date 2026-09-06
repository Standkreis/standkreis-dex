'use client'

import { useTranslations } from 'next-intl'
import { CountersBar, type SetCounters } from './AtlasCounters'

export { useSetCounters, type SetCounters } from './AtlasCounters'

// Profil's card over the three counters (findings 0002 §10, doubt 41: the profile counts the year). The numbers and the
// bar come from AtlasCounters, the one hook the grid header shares (handoff 0007 §🔀).
export function CountersCard({ regionName, counters }: { regionName: string | null; counters: SetCounters }) {
  const t = useTranslations('you')
  const ready = counters.state === 'ready'
  return (
    <section className="rounded-3xl bg-card px-4 py-4 shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
      <div className="text-[13px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
        {regionName ?? t('noRegion')} · {t('wholeYear')}
      </div>
      <CountersBar counters={counters} className="mt-3" />
      {/* 15 px like the atlas header (handoff 0014 P1). */}
      <p className="mt-3 text-[15px] text-ink-soft" data-testid="counters">
        {ready ? (
          <>
            <span className="font-bold text-amber">{t('studied', { n: counters.studied })}</span>
            <span className="text-ink-soft"> · </span>
            <span className="font-bold text-moss-deep">{t('seen', { n: counters.seen })}</span>
            <span className="text-ink-soft"> · {t('possible', { n: counters.possible })}</span>
          </>
        ) : (
          <span className="text-ink-soft">{t('preparing')}</span>
        )}
      </p>
    </section>
  )
}
