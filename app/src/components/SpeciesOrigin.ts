// Where a chain of species pages started (handoff 0014 P4): the atlas or the diary, with its query string and scroll
// offset, written when a tab's link to a species page is tapped. Species → species links leave it alone, so the page's
// back affordance always lands where the chain began instead of one page up. sessionStorage: per tab, gone with it.
const KEY = 'dex.speciesOrigin'
type Origin = { path: string; scrollY: number }

/** Called on the tab's link (grid cell, diary row, the fill sheet, the sighting page): `path` without the locale, as next-intl's usePathname gives it. */
export function rememberSpeciesOrigin(path: string) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ path: `${path}${window.location.search}`, scrollY: window.scrollY } satisfies Origin)) } catch {}
}

/** The path to go back to; the atlas when nothing was remembered (a pasted link, a fresh tab). */
export function speciesOrigin(): string {
  try { const o = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Origin | null; return o?.path ?? '/' } catch { return '/' }
}

/** The tab, once its list is on screen: back to where the finger was. One shot, so a plain visit to the tab does not jump. */
export function restoreSpeciesOrigin(path: string) {
  try {
    const o = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Origin | null
    if (!o || o.path.split('?')[0] !== path) return
    sessionStorage.removeItem(KEY)
    if (o.scrollY > 0) window.scrollTo(0, o.scrollY)
  } catch {}
}
