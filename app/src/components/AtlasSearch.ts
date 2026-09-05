// The grid's search (handoff 0007 Track A): client-side over the current set, names in every language and the Latin
// name, case and diacritics insensitive, prefix or word match. "amsel" finds Amsel and not damselfly; "turdus" finds every
// Turdus; "blackbird" finds Common blackbird. Backbone search is M6 and lives elsewhere.

export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .trim()

const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter(Boolean)

export type Searchable = { names: Record<string, string>; sciName: string }

/** 0 = the name shown under the cell starts with the query, 1 = any other name or word does, null = no match. */
export function matchRank(s: Searchable, query: string, displayName: string): 0 | 1 | null {
  const q = fold(query)
  if (!q) return 0
  if (fold(displayName).startsWith(q)) return 0
  const all = [...Object.values(s.names), s.sciName]
  for (const n of all) {
    if (fold(n).startsWith(q)) return 1
    if (words(n).some((w) => w.startsWith(q))) return 1
  }
  return null
}

/** Filters `items` to the matches and orders them by rank, keeping the incoming order inside a rank. */
export function search<T extends Searchable>(items: T[], query: string, displayName: (s: T) => string): T[] {
  if (!fold(query)) return items
  const ranked: { item: T; rank: number }[] = []
  for (const item of items) {
    const rank = matchRank(item, query, displayName(item))
    if (rank !== null) ranked.push({ item, rank })
  }
  return ranked.sort((a, b) => a.rank - b.rank).map((r) => r.item)
}
