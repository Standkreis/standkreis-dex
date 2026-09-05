'use client'

import { useTranslations } from 'next-intl'

/** Local day key, YYYY-MM-DD, the same shape `journal.days` groups by. */
export const dayKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** "Heute · Fr 5. Sep" · "Gestern · Do 4. Sep" · "Mi 2. Sep" · "Mi 2. Sep 2025" (findings 0002 §8 T1). Weekday and month names come from the locale keys, so both languages read like the mock. */
export function useDayLabel() {
  const t = useTranslations('journal')
  const weekdays = t('weekdays').split(' ')
  const months = t('months').split(' ')
  const now = new Date()
  const today = dayKeyOf(now)
  const yesterday = dayKeyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const format = (key: string, withYear = false) => {
    const [y, m, d] = key.split('-').map(Number)
    const date = new Date(y!, m! - 1, d!)
    const args = { wd: weekdays[date.getDay()]!, d: d!, mon: months[m! - 1]!, y: y! }
    return withYear || y !== now.getFullYear() ? t('dayFormatYear', args) : t('dayFormat', args)
  }
  return {
    /** The day card header. */
    label: (key: string) => (key === today ? t('today', { date: format(key) }) : key === yesterday ? t('yesterday', { date: format(key) }) : format(key)),
    /** The plain date with the year, for the single sighting. */
    full: (d: Date) => format(dayKeyOf(d), true),
  }
}
