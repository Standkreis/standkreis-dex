'use client'

import { useTranslations } from 'next-intl'
import { useAtlasSet } from './AtlasCounters'
import { groupsOf } from './GroupRows'

// Progress per group (handoff 0014 P3): one row per tile of the region's set, the group's name, the two counts over the
// group's size, and two thin bars: studied amber, discovered moss, the order of the counter line and its bar. No radar:
// at one find per group both areas would be a dot for months. Same cache entry as the grid and the counters card;
// the counting is `groupsOf` in GroupRows.ts.

// A first find is under 1 % of a big group: floor a non-zero bar at 2 % so it shows at all (as CountersBar).
const pct = (n: number, possible: number) => `${n > 0 ? Math.max(2, Math.min(100, Math.round((n / Math.max(possible, 1)) * 100))) : 0}%`

export function GroupProgress({ region }: { region: { id: string; status: string } | null }) {
  const t = useTranslations('you')
  const td = useTranslations('dex')
  const { set, progress } = useAtlasSet(region)
  const rows = groupsOf(set, progress)
  return (
    <section className="rounded-3xl bg-card px-4 py-4 shadow-[0_2px_12px_rgba(30,42,35,0.06)]" data-testid="groups">
      <div className="text-[13px] font-semibold tracking-[0.08em] text-ink-faint uppercase">{t('groups')}</div>
      {rows ? (
        <ul className="mt-3 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.tile} data-testid={`group-${r.tile}`} data-studied={r.studied} data-seen={r.seen} data-possible={r.possible}>
              <div className="flex items-baseline justify-between text-[15px]">
                <span className="font-semibold">{td(`tile.${r.tile}`)}</span>
                <span className="text-[13px] text-ink-soft">
                  <span className="font-bold text-amber">{r.studied}</span> · <span className="font-bold text-moss-deep">{r.seen}</span> {t('ofPossible', { n: r.possible })}
                </span>
              </div>
              <div className="mt-1.5 flex flex-col gap-1" aria-hidden>
                <div className="h-1 overflow-hidden rounded-full bg-tile"><span className="block h-full rounded-full bg-amber" style={{ width: pct(r.studied, r.possible) }} data-testid="bar-studied" /></div>
                <div className="h-1 overflow-hidden rounded-full bg-tile"><span className="block h-full rounded-full bg-moss" style={{ width: pct(r.seen, r.possible) }} data-testid="bar-seen" /></div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[15px] text-ink-soft">{t('preparing')}</p>
      )}
    </section>
  )
}
