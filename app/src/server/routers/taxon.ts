import { z } from 'zod'
import type { InteractionKind } from '@/generated/prisma/enums'
import { get, q } from '../../../etl/fetch'
import { gbifSpecies } from '../../../etl/gbif'
import { isNow, nowRatio, perMille, tileOf } from '../../../etl/rules'
import { publicProcedure, router } from '../trpc'

const thisMonth = () => new Date().getMonth() + 1
// A card on the species page (look-alike, ecology chip) carries its first image, greyscaled by dex state (handoff 0007 Track B).
const taxonCard = { id: true, gbifKey: true, sciName: true, commonNames: true, tile: true, contentAt: true, assets: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1, select: { url: true } } } as const
const ensureSelect = { id: true, gbifKey: true, sciName: true, commonNames: true, tile: true, contentAt: true } as const
type Card = { id: string; gbifKey: number; sciName: string; commonNames: unknown; tile: string; assets: { url: string }[] }
const card = (t: Card) => ({ id: t.id, gbifKey: t.gbifKey, sciName: t.sciName, names: t.commonNames as Record<string, string>, tile: t.tile, lead: t.assets[0]?.url ?? null })

type Occurrences = { results: { decimalLatitude?: number; decimalLongitude?: number }[] }
/** A stand-in centroid for a GADM unit (no geometry column, record 0002 E1): the midpoint of the bbox of 300 GBIF records inside it. Cached on disk by the fetch layer. */
async function regionCentre(gadmGid: string): Promise<{ lat: number; lng: number } | null> {
  const j = await get<Occurrences>(`https://api.gbif.org/v1/occurrence/search?${q({ gadmGid, hasCoordinate: true, limit: 300 })}`)
  const pts = (j?.results ?? []).filter((r): r is { decimalLatitude: number; decimalLongitude: number } => typeof r.decimalLatitude === 'number' && typeof r.decimalLongitude === 'number')
  if (pts.length < 10) return null
  const lats = pts.map((p) => p.decimalLatitude), lngs = pts.map((p) => p.decimalLongitude)
  return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 }
}

// The species page (spec §🎨 3). Pure read; the dex state row (studiert · entdeckt) is the client's join (M5/M6).
export const taxonRouter = router({
  /**
   * Everything the page renders: names, intro, facts, assets with attribution, the region's plausibility (bars and
   * words), look-alikes within that region's set, interactions grouped by kind with each target's set membership.
   * Out-of-set species (E13) have `plausibility: null`: no bars, "hier selten gemeldet".
   */
  page: publicProcedure
    .input(z.object({ gbifKey: z.number().int(), regionId: z.string().uuid().optional(), month: z.number().int().min(1).max(12).optional() }))
    .query(async ({ ctx, input }) => {
      const month = input.month ?? thisMonth()
      const t = await ctx.db.taxon.findUnique({
        where: { gbifKey: input.gbifKey },
        include: { assets: { orderBy: { createdAt: 'asc' } }, interactionsFrom: { include: { target: { select: taxonCard } } } },
      })
      if (!t) return null
      const regionId = input.regionId
      const [p, lookalikes, inSet] = regionId
        ? await Promise.all([
            ctx.db.plausibility.findUnique({ where: { taxonId_regionId: { taxonId: t.id, regionId } } }),
            ctx.db.lookalike.findMany({ where: { taxonId: t.id, regionId }, include: { sibling: { select: taxonCard } } }),
            ctx.db.plausibility.findMany({ where: { regionId, taxonId: { in: t.interactionsFrom.map((i) => i.targetId) } }, select: { taxonId: true } }).then((rows) => new Set(rows.map((r) => r.taxonId))),
          ])
        : [null, [], new Set<string>()]
      const grouped: Partial<Record<InteractionKind, (ReturnType<typeof card> & { inSet: boolean })[]>> = {}
      for (const i of t.interactionsFrom) (grouped[i.kind] ??= []).push({ ...card(i.target), inSet: inSet.has(i.targetId) })
      return {
        id: t.id,
        gbifKey: t.gbifKey,
        wikidataId: t.wikidataId,
        sciName: t.sciName,
        names: t.commonNames as Record<string, string>,
        rank: t.rank,
        tile: t.tile,
        class: t.class,
        order: t.order,
        genus: t.genus,
        iucn: t.iucn,
        tags: t.tags,
        intro: t.intro as { text: string; lang: string; source: string; licence: string } | null,
        facts: t.facts as Record<string, { value: string; source: string }> | null,
        contentAt: t.contentAt,
        assets: t.assets.map((a) => ({ id: a.id, kind: a.kind, url: a.url, author: a.author, licence: a.licence, licenceUrl: a.licenceUrl, sourceUrl: a.sourceUrl, origin: a.origin, caption: a.caption })),
        plausibility: p
          ? { obs: p.obs, monthShare: p.monthShare.map(perMille), peak: perMille(p.peak), words: p.words, month, nowRatio: +nowRatio(p.monthShare, p.peak, month).toFixed(3), now: isNow(p.monthShare, p.peak, month) }
          : null,
        lookalikes: lookalikes.map((l) => card(l.sibling)),
        interactions: grouped,
      }
    }),

  /**
   * Where the species map centres (handoff 0007 Track B): the region has no geometry column (record 0002 E1), so the
   * midpoint of the bounding box of 300 GBIF records inside the GADM unit stands in. One cached GBIF call per region.
   */
  mapCentre: publicProcedure.input(z.object({ regionId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const region = await ctx.db.region.findUnique({ where: { id: input.regionId }, select: { gadmGid: true, name: true } })
    if (!region) return null
    const centre = await regionCentre(region.gadmGid)
    return centre && { name: region.name, ...centre }
  }),

  /**
   * A backbone species outside every set (record 0002 E13), used by the log flow: creates the Taxon row from GBIF
   * species/{key} when missing. Content (names, intro, images) comes with the next `etl content` run; `contentAt` stays null.
   */
  ensure: publicProcedure.input(z.object({ gbifKey: z.number().int() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.taxon.findUnique({ where: { gbifKey: input.gbifKey }, select: ensureSelect })
    if (existing) return { ...existing, created: false }
    const s = await gbifSpecies(input.gbifKey)
    if (!s) throw new Error(`GBIF has no taxon ${input.gbifKey}`)
    const tile = tileOf(s)
    if (!tile) throw new Error(`taxon ${input.gbifKey} (${s.canonicalName}) fits no tile`)
    const created = await ctx.db.taxon.create({
      data: { gbifKey: s.key, sciName: s.canonicalName ?? s.scientificName ?? String(s.key), rank: (s.rank ?? 'SPECIES').toLowerCase(), tile, class: s.class ?? null, order: s.order ?? null, genus: s.genus ?? null },
      select: ensureSelect,
    })
    return { ...created, created: true }
  }),
})
