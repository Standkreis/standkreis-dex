import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { UA } from '../../../etl/fetch'
import { identify, isJpeg, regionSet } from '../identify'
import { deletePhoto, readPhoto } from '../photos'
import { shouldOfferPasskey } from '../webauthn'
import { publicProcedure, router, type Context } from '../trpc'
import { backboneSearch } from './taxon'

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
   * `id` is the client's (handoff 0009 Track B): the outbox mints it, so a flush retried after a lost answer finds the
   * row it already made and returns it instead of a second one. Someone else's id is a conflict, never a read.
   */
  create: publicProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        taxonId: z.string().uuid(),
        at: z.coerce.date(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        note: z.string().trim().max(500).optional(),
        wildness: z.enum(['wild', 'captive', 'cultivated']),
        photoId: z.string().uuid().optional(),
        /** The species is the scan's answer, taken with "Das ist es" (handoff 0016 B4): `evidence` becomes `idAssisted`. */
        idAssisted: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = ctx.identity.id
      if (input.id) {
        const existing = await ctx.db.sighting.findUnique({ where: { id: input.id }, select: { id: true, identityId: true, taxonId: true, at: true, createdAt: true, place: true, wildness: true, evidence: true } })
        if (existing && existing.identityId !== id) throw new TRPCError({ code: 'CONFLICT', message: 'id taken' })
        if (existing) return { id: existing.id, at: existing.at, place: existing.place, wildness: existing.wildness, evidence: existing.evidence, first: await isFirst(ctx.db, existing) }
      }
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
          ...(input.id ? { id: input.id } : {}),
          identityId: id,
          taxonId: input.taxonId,
          at: input.at,
          lat: hasPoint ? input.lat : null,
          lng: hasPoint ? input.lng : null,
          place,
          note: input.note || null,
          evidence: photo && input.idAssisted ? 'idAssisted' : photo ? 'photographed' : 'claimed',
          wildness: input.wildness,
          ...(photo ? { photos: { connect: { id: photo.id } } } : {}),
        },
      })
      const first = await isFirst(ctx.db, row)
      return { id: row.id, at: row.at, place: row.place, wildness: row.wildness, evidence: row.evidence, first }
    }),

  /**
   * The scan (handoff 0016 Track A, record 0003): one of the identity's uploaded photos, attached or not, against a
   * region's set through Claude Sonnet 5 (`server/identify.ts`). The set prompt is built once per region and cached
   * in this process and, for five minutes, at Anthropic. Returns the subject gate, the answer joined to the set (species
   * rank only at confidence ≥ 0.7), the outside guess, the ladder with its evidence, the hint and the cost line.
   * Nothing is stored: the sighting is the client's next call. Every failure is a typed error (415, 429, 408, 502, 422).
   * `locale` overrides the request's (the outbox flush and scripts); the ladder's prose comes back in that language.
   */
  identify: publicProcedure
    .input(z.object({ photoId: z.string().uuid(), regionId: z.string().uuid(), locale: z.enum(['de', 'en']).optional() }))
    .mutation(async ({ ctx, input }) => {
      const photo = await ctx.db.asset.findFirst({ where: { id: input.photoId, ownerId: ctx.identity.id, origin: 'user' }, select: { id: true } })
      if (!photo) throw new TRPCError({ code: 'NOT_FOUND', message: 'unknown photo' })
      const set = await regionSet(input.regionId, async () => {
        const region = await ctx.db.region.findUnique({ where: { id: input.regionId }, select: { id: true, name: true, higher: true } })
        if (!region) return null
        const rows = await ctx.db.plausibility.findMany({ where: { regionId: region.id }, select: { taxon: { select: { gbifKey: true, sciName: true, commonNames: true } } } })
        return { region, rows: rows.map((r) => ({ gbifKey: r.taxon.gbifKey, sciName: r.taxon.sciName, de: (r.taxon.commonNames as Record<string, string>).de ?? null })) }
      })
      if (!set) throw new TRPCError({ code: 'NOT_FOUND', message: 'unknown region' })
      const file = await readPhoto(photo.id)
      if (!file) throw new TRPCError({ code: 'NOT_FOUND', message: 'photo file missing' })
      const jpeg = file.body instanceof Uint8Array ? file.body : new Uint8Array(await new Response(file.body).arrayBuffer())
      if (!isJpeg(jpeg)) throw new TRPCError({ code: 'UNSUPPORTED_MEDIA_TYPE', message: 'not a JPEG' })
      return identify({ jpeg, set, locale: input.locale ?? ctx.locale, search: backboneSearch })
    }),

  /** Bind an uploaded, still unattached photo (POST /api/photo) to one of the identity's sightings: the fill sheet's "Foto". */
  attachPhoto: publicProcedure.input(z.object({ sightingId: z.string().uuid(), photoId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const id = ctx.identity.id
    const [s, photo] = await Promise.all([
      ctx.db.sighting.findFirst({ where: { id: input.sightingId, identityId: id }, select: { id: true } }),
      ctx.db.asset.findFirst({ where: { id: input.photoId, ownerId: id, sightingId: null }, select: { id: true } }),
    ])
    if (!s || !photo) throw new TRPCError({ code: 'NOT_FOUND', message: s ? 'unknown photo' : 'unknown sighting' })
    await ctx.db.$transaction([
      ctx.db.asset.update({ where: { id: photo.id }, data: { sightingId: s.id } }),
      ctx.db.sighting.update({ where: { id: s.id }, data: { evidence: 'photographed' } }),
    ])
    return { id: s.id, photoId: photo.id }
  }),

  /** Remove one of the identity's photos, attached or not: the file and the row; the sighting falls back to `claimed`. */
  removePhoto: publicProcedure.input(z.object({ photoId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const photo = await ctx.db.asset.findFirst({ where: { id: input.photoId, ownerId: ctx.identity.id, origin: 'user' }, select: { id: true } })
    if (!photo) throw new TRPCError({ code: 'NOT_FOUND', message: 'unknown photo' })
    await deletePhoto(photo.id)
    return { id: photo.id }
  }),

  /**
   * The identity's latest wild photo per taxon (spec §🎨 2: own photo first, else the reference image). `dex.set` stays a
   * pure read; the grid overlays this map on the cells.
   */
  photos: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.asset.findMany({
      where: { origin: 'user', kind: 'image', ownerId: ctx.identity.id, sighting: { wildness: 'wild' } },
      select: { url: true, sighting: { select: { taxonId: true, at: true } } },
      orderBy: [{ sighting: { at: 'desc' } }, { createdAt: 'desc' }],
    })
    const out: Record<string, string> = {}
    for (const r of rows) if (r.sighting && !(r.sighting.taxonId in out)) out[r.sighting.taxonId] = r.url
    return out
  }),

  /**
   * Species the identity has seen wild that are not in the region's set (record 0002 E13): the grid shows them at the
   * bottom with the tile icon until the content kick lands a lead image. The set itself never changes.
   */
  outside: publicProcedure.input(z.object({ regionId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const seen = await ctx.db.sighting.findMany({ where: { identityId: ctx.identity.id, wildness: 'wild' }, select: { taxonId: true }, distinct: ['taxonId'] })
    if (!seen.length) return []
    const taxa = await ctx.db.taxon.findMany({
      where: { id: { in: seen.map((s) => s.taxonId) }, plausibility: { none: { regionId: input.regionId } } },
      select: { id: true, gbifKey: true, sciName: true, commonNames: true, tile: true, contentAt: true, assets: { where: { kind: 'image', sightingId: null }, orderBy: { createdAt: 'asc' }, take: 1, select: { url: true, author: true, licence: true, licenceUrl: true, sourceUrl: true, origin: true } } },
      orderBy: { sciName: 'asc' },
    })
    return taxa.map((t) => ({ taxonId: t.id, gbifKey: t.gbifKey, sciName: t.sciName, names: t.commonNames as Record<string, string>, tile: t.tile, lead: t.assets[0] ?? null, hasContent: t.contentAt !== null }))
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
    const [first, offerPasskey] = await Promise.all([isFirst(ctx.db, s), shouldOfferPasskey(ctx.db, ctx.identity.id)])
    return {
      id: s.id,
      offerPasskey,
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
