import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { UA } from '../../../etl/fetch'
import { publicProcedure, router, type Context } from '../trpc'

// The sighting is the atom (record Q1, spec §🧬). This router creates one and reads one back for the fill moment
// (handoff 0008 Track A). Lists and edits are the Tagebuch's (`journal.ts`, Track B).

const GBIF = 'https://api.gbif.org/v1'
type ReverseHit = { id: string; type: string; title: string; distance: number }

/**
 * The Gemeinde label of the location ladder (spec §⚖️): GADM level 3 from GBIF `geocode/reverse` (a Gemeinde or a
 * Verbandsgemeinde in Rheinland-Pfalz), the nearest hit. No disk cache: every point is new. Null when GBIF has none.
 */
export async function gemeinde(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(`${GBIF}/geocode/reverse?lat=${lat}&lng=${lng}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const hits = (await r.json()) as ReverseHit[]
    const l3 = hits.filter((h) => h.type === 'GADM3').sort((a, b) => a.distance - b.distance)[0]
    return l3?.title ?? null
  } catch {
    return null
  }
}

const taxonSelect = { id: true, gbifKey: true, sciName: true, commonNames: true, tile: true, assets: { where: { kind: 'image', sightingId: null }, orderBy: { createdAt: 'asc' }, take: 1, select: { url: true, author: true, licence: true, licenceUrl: true, sourceUrl: true, origin: true } } } as const

/**
 * "First" (one rule for both tracks, handoff 0008 §🔀): the earliest WILD sighting of a taxon for an identity, ties by
 * `createdAt`. Captive and cultivated rows never count (spec §⚖️ wild only).
 */
async function isFirst(db: Context['db'], row: { id: string; identityId: string; taxonId: string; at: Date; createdAt: Date; wildness: string }) {
  if (row.wildness !== 'wild') return false
  const earlier = await db.sighting.count({
    where: { identityId: row.identityId, taxonId: row.taxonId, wildness: 'wild', id: { not: row.id }, OR: [{ at: { lt: row.at } }, { at: row.at, createdAt: { lt: row.createdAt } }] },
  })
  return earlier === 0
}

export const sightingRouter = router({
  /** The Gemeinde for a point, for the save screen's "Wo" card before the save. */
  place: publicProcedure.input(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })).query(async ({ input }) => ({ place: await gemeinde(input.lat, input.lng) })),

  /**
   * Save one sighting (spec §🎨 4). `evidence` follows the photo; `place` is the Gemeinde of the exact point, else the
   * region's name; the exact point is stored as is (doubt 17). Returns `first`: this row is the taxon's earliest wild
   * sighting, so the grid fills a cell; otherwise the grid shows the quiet toast (doubt 12).
   */
  create: publicProcedure
    .input(
      z.object({
        taxonId: z.string().uuid(),
        at: z.coerce.date(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        note: z.string().trim().max(500).optional(),
        wildness: z.enum(['wild', 'captive', 'cultivated']),
        photoId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = ctx.identity.id
      const [taxon, filter, photo] = await Promise.all([
        ctx.db.taxon.findUnique({ where: { id: input.taxonId }, select: { id: true } }),
        ctx.db.filter.findUnique({ where: { identityId: id }, select: { region: { select: { name: true } } } }),
        input.photoId ? ctx.db.asset.findFirst({ where: { id: input.photoId, ownerId: id, sightingId: null }, select: { id: true } }) : null,
      ])
      if (!taxon) throw new TRPCError({ code: 'NOT_FOUND', message: 'unknown taxon' })
      if (input.photoId && !photo) throw new TRPCError({ code: 'NOT_FOUND', message: 'unknown photo' })
      const hasPoint = input.lat !== undefined && input.lng !== undefined
      const place = (hasPoint ? await gemeinde(input.lat!, input.lng!) : null) ?? filter?.region?.name ?? null
      const row = await ctx.db.sighting.create({
        data: {
          identityId: id,
          taxonId: input.taxonId,
          at: input.at,
          lat: hasPoint ? input.lat : null,
          lng: hasPoint ? input.lng : null,
          place,
          note: input.note || null,
          evidence: photo ? 'photographed' : 'claimed',
          wildness: input.wildness,
          ...(photo ? { photos: { connect: { id: photo.id } } } : {}),
        },
      })
      const first = await isFirst(ctx.db, row)
      return { id: row.id, at: row.at, place: row.place, wildness: row.wildness, evidence: row.evidence, first }
    }),

  /**
   * What the fill sheet and the toast show (spec §🎨 5): the species card with the reference image and its attribution,
   * the own photo when one is attached, date and Gemeinde, and `first` by the shared rule. Only the identity's own rows.
   */
  fill: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const s = await ctx.db.sighting.findFirst({
      where: { id: input.id, identityId: ctx.identity.id },
      include: { taxon: { select: taxonSelect }, photos: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1, select: { id: true, url: true } } },
    })
    if (!s) return null
    const first = await isFirst(ctx.db, s)
    return {
      id: s.id,
      at: s.at,
      place: s.place,
      wildness: s.wildness,
      evidence: s.evidence,
      first,
      photo: s.photos[0] ?? null,
      taxon: { id: s.taxon.id, gbifKey: s.taxon.gbifKey, sciName: s.taxon.sciName, names: s.taxon.commonNames as Record<string, string>, tile: s.taxon.tile, lead: s.taxon.assets[0] ?? null },
    }
  }),
})
