// Progress per group (handoff 0014 P3), the pure part: one row per tile of the region's set, the identity's studied and
// seen counts over the group's size. `set.tiles` already drops fish when the region has none (record 0002 E12); an
// out-of-set find (E13) belongs to no row. Tested in GroupRows.test.ts; the card is IdentityGroups.tsx.
export type GroupRow<T extends string = string> = { tile: T; studied: number; seen: number; possible: number }

export function groupsOf<T extends string>(set: { tiles: { tile: T }[]; species: { taxonId: string; tile: T }[] } | null, progress: { studied: string[]; seen: string[] } | null): GroupRow<T>[] | null {
  if (!set || !progress) return null
  const tileOf = new Map(set.species.map((s) => [s.taxonId, s.tile]))
  const rows = new Map<T, GroupRow<T>>(set.tiles.map(({ tile }) => [tile, { tile, studied: 0, seen: 0, possible: 0 }]))
  for (const s of set.species) { const r = rows.get(s.tile); if (r) r.possible++ }
  for (const id of new Set(progress.studied)) { const t = tileOf.get(id); const r = t && rows.get(t); if (r) r.studied++ }
  for (const id of new Set(progress.seen)) { const t = tileOf.get(id); const r = t && rows.get(t); if (r) r.seen++ }
  return [...rows.values()]
}
