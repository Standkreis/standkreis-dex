import { defineRouting } from 'next-intl/routing'

// de is the source of truth for vocabulary (studiert · entdeckt); en is the second language from the first string.
export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]
