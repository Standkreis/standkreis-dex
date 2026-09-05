import { z } from 'zod'
import { Tile } from '@/generated/prisma/enums'
import { isNow, nowRatio, perMille } from '../../../etl/rules'
import { publicProcedure, router } from '../trpc'

const tile = z.enum(Object.values(Tile) as [Tile, ...Tile[]])
const thisMonth = () => new Date().getMonth() + 1

// The grid's data (spec §🧬 "The plausible set", §🎨 2). Pure read: no identity, the dex state is joined by the client (M5).
export const dexRouter = router({
  /**
   * The species of a region's set for the given tiles, sorted "jetzt wahrscheinlich" (this month's share ÷ peak, then
   * observations). `nowOnly` keeps only the species at ≥ 25 % of their peak this month. The fish tile is hidden
   * (dropped from `tiles` and never returned) when the region's set has no fish (record 0002 E12).
   */
  set: publicProcedure
    .input(z.object({ regionId: z.string().uuid(), tiles: z.array(tile).min(1), nowOnly: z.boolean().default(false), month: z.number().int().min(1).max(12).optional() }))
    .query(async ({ ctx, input }) => {
      const month = input.month ?? thisMonth()
      const region = await ctx.db.region.findUnique({ where: { id: input.regionId }, select: { id: true, name: true, higher: true, status: true, refreshedAt: true, monthTotals: true } })
      if (!region) return null
      const counts = await ctx.db.plausibility.groupBy({ by: ['taxonId'], where: { regionId: region.id }, _count: true })
      const tilesPresent = await ctx.db.taxon.groupBy({ by: ['tile'], where: { plausibility: { some: { regionId: region.id } } }, _count: { _all: true } })
      const present = new Map(tilesPresent.map((t) => [t.tile, t._count._all]))
      const tiles = input.tiles.filter((t) => t !== 'fish' || (present.get('fish') ?? 0) > 0)
      const rows = await ctx.db.plausibility.findMany({
        where: { regionId: region.id, taxon: { tile: { in: tiles } } },
        include: { taxon: { include: { assets: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1 } } } },
      })
      const species = rows
        .map((p) => ({
          taxonId: p.taxonId,
          gbifKey: p.taxon.gbifKey,
          sciName: p.taxon.sciName,
          names: p.taxon.commonNames as Record<string, string>,
          tile: p.taxon.tile,
          obs: p.obs,
          monthShare: p.monthShare.map(perMille),
          peak: perMille(p.peak),
          nowRatio: +nowRatio(p.monthShare, p.peak, month).toFixed(3),
          now: isNow(p.monthShare, p.peak, month),
          words: p.words,
          lead: p.taxon.assets[0] ?? null,
          hasContent: p.taxon.contentAt !== null,
        }))
        .filter((s) => !input.nowOnly || s.now)
        .sort((a, b) => b.nowRatio - a.nowRatio || b.obs - a.obs)
      return {
        region,
        month,
        setSize: counts.length,
        tiles: (Object.values(Tile) as Tile[]).filter((t) => t !== 'fish' || (present.get('fish') ?? 0) > 0).map((t) => ({ tile: t, count: present.get(t) ?? 0 })),
        species,
      }
    }),

  /** Regions the ETL knows, for the onboarding picker and the filter drawer. */
  regions: publicProcedure.query(({ ctx }) => ctx.db.region.findMany({ orderBy: { name: 'asc' }, select: { id: true, gadmGid: true, name: true, higher: true, status: true, refreshedAt: true } })),
})
