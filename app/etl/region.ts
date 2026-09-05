// The region job (spec §🗃️ A–C, record 0002 E1 E2 E3 E5 E10 E11): GADM → Region row → 13 GBIF facets → cut per tile →
// Taxon, Plausibility and Lookalike rows. Everything is written in one transaction at the end; a failed facet leaves the
// region `failed` with the error and no half-written rows.
import type { Tile } from '../src/generated/prisma/enums'
import { db } from './db'
import { pool, requests } from './fetch'
import { gbifFacet, gbifSpecies, occurrenceBase, resolveRegion, type Species } from './gbif'
import { cutTile, isNow, monthShares, tileOf, words } from './rules'

const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

type Candidate = { key: number; obs: number; byMonth: number[]; species: Species; tile: Tile }

export type RegionResult = {
  regionId: string
  gadmGid: string
  name: string
  total: number
  monthTotals: number[]
  perTile: Record<string, number>
  set: number
  lookalikes: number
  nowInMonth: (month: number) => number
  seconds: number
  requests: ReturnType<typeof requests>
}

/** Fetch and write one region. `query` is a name ("Mainz-Bingen") or a GADM gid ("DEU.11.19_1"). */
export async function runRegion(query: string, log: (s: string) => void = console.log): Promise<RegionResult> {
  const t0 = Date.now()
  const gadm = await resolveRegion(query)
  log(`region ${gadm.name} (${gadm.gadmGid}, level ${gadm.level}) · ${gadm.higher}`)
  const region = await db.region.upsert({
    where: { gadmGid: gadm.gadmGid },
    create: { gadmGid: gadm.gadmGid, name: gadm.name, higher: gadm.higher, status: 'queued' },
    update: { name: gadm.name, higher: gadm.higher, status: 'queued', error: null },
  })
  try {
    const r = await fetchAndWrite(region.id, gadm.gadmGid, log)
    return { ...r, regionId: region.id, gadmGid: gadm.gadmGid, name: gadm.name, seconds: (Date.now() - t0) / 1000, requests: requests() }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await db.region.update({ where: { id: region.id }, data: { status: 'failed', error: message.slice(0, 1000) } })
    throw e
  }
}

async function fetchAndWrite(regionId: string, gadmGid: string, log: (s: string) => void) {
  const base = occurrenceBase(gadmGid)
  // 13 facets, 4 in flight: the year decides membership and `obs`, the twelve months give the shares (findings 0006).
  const [year, ...months] = await pool(['year', ...MONTH_NUMBERS] as const, 4, (m) =>
    m === 'year' ? gbifFacet('speciesKey', base) : gbifFacet('speciesKey', { ...base, month: m }),
  )
  const monthTotals = months.map((f) => f.total)
  log(`facets: ${year.total} obs, ${year.counts.length} species in the year; months ${monthTotals.join(' ')}`)
  const byMonth = new Map<number, number[]>()
  months.forEach((f, i) => {
    for (const c of f.counts) {
      const key = Number(c.name)
      const m = byMonth.get(key) ?? Array(12).fill(0)
      m[i] = c.count
      byMonth.set(key, m)
    }
  })
  // Species records for everything at or above the floor: the ranks decide the tile.
  const eligible = year.counts.filter((c) => c.count >= 10).map((c) => ({ key: Number(c.name), obs: c.count }))
  const species = await pool(eligible, 6, (c) => gbifSpecies(c.key))
  const candidates: Candidate[] = []
  let noTile = 0
  eligible.forEach((c, i) => {
    const s = species[i]
    const tile = s && tileOf(s)
    if (!s || !tile) {
      noTile++
      return
    }
    candidates.push({ ...c, byMonth: byMonth.get(c.key) ?? Array(12).fill(0), species: s, tile })
  })
  log(`species ≥ 10: ${eligible.length}, without a tile: ${noTile}`)
  // The cut, per tile.
  const perTileList = new Map<Tile, Candidate[]>()
  for (const c of candidates) perTileList.set(c.tile, [...(perTileList.get(c.tile) ?? []), c])
  const set = [...perTileList.values()].flatMap((list) => cutTile(list))
  const perTile: Record<string, number> = {}
  for (const c of set) perTile[c.tile] = (perTile[c.tile] ?? 0) + 1
  // Shares, peak, words.
  const rows = set.map((c) => {
    const shares = monthShares(c.byMonth, monthTotals)
    const peak = Math.max(...shares)
    return { ...c, shares, peak, words: words(shares) }
  })
  // Look-alikes: same genus within the set, both directions (E10).
  const byGenus = new Map<string, Candidate[]>()
  for (const c of set) if (c.species.genus) byGenus.set(c.species.genus, [...(byGenus.get(c.species.genus) ?? []), c])
  const pairs = [...byGenus.values()].filter((g) => g.length > 1).flatMap((g) => g.flatMap((a) => g.filter((b) => b !== a).map((b) => [a.key, b.key] as const)))

  await db.$transaction(
    async (tx) => {
      for (const c of set) {
        const s = c.species
        const data = { sciName: s.canonicalName ?? s.scientificName ?? String(c.key), rank: (s.rank ?? 'SPECIES').toLowerCase(), tile: c.tile, class: s.class ?? null, order: s.order ?? null, genus: s.genus ?? null }
        await tx.taxon.upsert({ where: { gbifKey: c.key }, create: { gbifKey: c.key, ...data }, update: data })
      }
      const taxa = await tx.taxon.findMany({ where: { gbifKey: { in: set.map((c) => c.key) } }, select: { id: true, gbifKey: true } })
      const idOf = new Map(taxa.map((t) => [t.gbifKey, t.id]))
      await tx.lookalike.deleteMany({ where: { regionId } })
      await tx.plausibility.deleteMany({ where: { regionId } })
      await tx.plausibility.createMany({ data: rows.map((r) => ({ taxonId: idOf.get(r.key)!, regionId, obs: r.obs, monthShare: r.shares, peak: r.peak, words: r.words })) })
      await tx.lookalike.createMany({ data: pairs.map(([a, b]) => ({ taxonId: idOf.get(a)!, regionId, siblingId: idOf.get(b)! })) })
      await tx.region.update({ where: { id: regionId }, data: { status: 'ready', error: null, monthTotals, refreshedAt: new Date() } })
    },
    { maxWait: 10_000, timeout: 120_000 },
  )
  return { total: year.total, monthTotals, perTile, set: set.length, lookalikes: pairs.length, nowInMonth: (month: number) => rows.filter((r) => isNow(r.shares, r.peak, month)).length }
}

/** Re-run the region job for every region older than `days` (E11: cached 30 days). */
export async function refresh(days = 30, log: (s: string) => void = console.log) {
  const stale = await db.region.findMany({ where: { OR: [{ refreshedAt: null }, { refreshedAt: { lt: new Date(Date.now() - days * 86_400_000) } }] } })
  log(`${stale.length} region(s) older than ${days} days`)
  for (const r of stale) await runRegion(r.gadmGid, log)
  return stale.length
}
