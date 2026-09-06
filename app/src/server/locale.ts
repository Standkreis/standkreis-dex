export type Locale = 'de' | 'en'
/**
 * The request's locale (handoff 0016 A5): the `x-dex-locale` header the tRPC client sends, else the `/de/…` or `/en/…`
 * prefix of the page that made the request (every page lives under one, `localePrefix: 'always'`), else German.
 */
export function localeOf(req: Request): Locale {
  const header = req.headers.get('x-dex-locale')
  if (header === 'de' || header === 'en') return header
  const m = req.headers.get('referer')?.match(/^https?:\/\/[^/]+\/(de|en)(?:[/?#]|$)/)
  return (m?.[1] as Locale | undefined) ?? 'de'
}
