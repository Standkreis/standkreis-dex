import { z } from 'zod'
import type { InteractionKind } from '@/generated/prisma/enums'
import { gbifSpecies } from '../../../etl/gbif'
import { isNow, nowRatio, perMille, tileOf } from '../../../etl/rules'
import { publicProcedure, router } from '../trpc'

const thisMonth = () => new Date().getMonth() + 1
const taxonCard = { id: true, gbifKey: true, sciName: true, commonNames: true, tile: true, contentAt: true } as const

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
      const grouped: Partial<Record<InteractionKind, { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; inSet: boolean }[]>> = {}
      for (const i of t.interactionsFrom) {
        const target = i.target
        ;(grouped[i.kind] ??= []).push({ id: target.id, gbifKey: target.gbifKey, sciName: target.sciName, names: target.commonNames as Record<string, string>, tile: target.tile, inSet: inSet.has(target.id) })
      }
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
        lookalikes: lookalikes.map((l) => ({ id: l.sibling.id, gbifKey: l.sibling.gbifKey, sciName: l.sibling.sciName, names: l.sibling.commonNames as Record<string, string>, tile: l.sibling.tile })),
        interactions: grouped,
      }
    }),

  /**
   * A backbone species outside every set (record 0002 E13), used by the log flow: creates the Taxon row from GBIF
   * species/{key} when missing. Content (names, intro, images) comes with the next `etl content` run; `contentAt` stays null.
   */
  ensure: publicProcedure.input(z.object({ gbifKey: z.number().int() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.taxon.findUnique({ where: { gbifKey: input.gbifKey }, select: taxonCard })
    if (existing) return { ...existing, created: false }
    const s = await gbifSpecies(input.gbifKey)
    if (!s) throw new Error(`GBIF has no taxon ${input.gbifKey}`)
    const tile = tileOf(s)
    if (!tile) throw new Error(`taxon ${input.gbifKey} (${s.canonicalName}) fits no tile`)
    const created = await ctx.db.taxon.create({
      data: { gbifKey: s.key, sciName: s.canonicalName ?? s.scientificName ?? String(s.key), rank: (s.rank ?? 'SPECIES').toLowerCase(), tile, class: s.class ?? null, order: s.order ?? null, genus: s.genus ?? null },
      select: taxonCard,
    })
    return { ...created, created: true }
  }),
})
