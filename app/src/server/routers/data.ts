import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { IDENTITY_COOKIE, publicProcedure, router } from '../trpc'
import { deletePhotoFilesOfIdentity } from '../photos'
import { signToken, verifyToken } from '../webauthn'

const DELETE_TTL = 300
type DeleteToken = { purpose: 'delete'; identityId: string }

// Spec §⚖️ "Your data is yours": export and delete in one screen, both identity states.
export const dataRouter = router({
  // Everything the identity owns, as one JSON document. displayName only once a passkey exists (doubt 39, spec §⚖️ "Name and photo are yours").
  export: publicProcedure.query(async ({ ctx }) => {
    const id = ctx.identity.id
    const [devices, filter, sightings, studies] = await Promise.all([
      ctx.db.passkey.count({ where: { identityId: id } }),
      ctx.db.filter.findUnique({ where: { identityId: id }, include: { region: { select: { gadmGid: true, name: true } } } }),
      ctx.db.sighting.findMany({
        where: { identityId: id },
        orderBy: { at: 'asc' },
        include: { taxon: { select: { gbifKey: true, sciName: true, commonNames: true } }, photos: { select: { url: true, licence: true, author: true } } },
      }),
      ctx.db.study.findMany({ where: { identityId: id }, orderBy: { at: 'asc' }, include: { taxon: { select: { gbifKey: true, sciName: true, commonNames: true } } } }),
    ])
    return {
      format: 'standkreis-dex/1',
      exportedAt: new Date(),
      identity: {
        id,
        createdAt: ctx.identity.createdAt,
        devices,
        email: ctx.identity.emailVerifiedAt ? ctx.identity.email : null, // the verified address (handoff 0020 E7); PII, yours to take along
        ...(devices > 0 || ctx.identity.emailVerifiedAt ? { displayName: ctx.identity.displayName } : {}),
      },
      filter: filter ? { region: filter.region, tiles: filter.tiles, nowOnly: filter.nowOnly } : null,
      sightings: sightings.map((s) => ({
        id: s.id,
        at: s.at,
        taxon: s.taxon,
        lat: s.lat,
        lng: s.lng,
        place: s.place,
        note: s.note,
        evidence: s.evidence,
        wildness: s.wildness,
        photos: s.photos.map((p) => p.url),
      })),
      studies: studies.map((s) => ({ at: s.at, taxon: s.taxon, recapPassed: s.recapPassed })),
    }
  }),

  // Two steps (doubt 33): without a token the call names what will go; with the token it goes. Never "only here".
  delete: publicProcedure.input(z.object({ token: z.string().optional() }).nullish()).mutation(async ({ ctx, input }) => {
    const id = ctx.identity.id
    if (!input?.token) {
      const [devices, sightings] = await Promise.all([ctx.db.passkey.count({ where: { identityId: id } }), ctx.db.sighting.count({ where: { identityId: id } })])
      return { step: 'confirm' as const, devices, sightings, token: signToken({ purpose: 'delete', identityId: id } satisfies DeleteToken, DELETE_TTL) }
    }
    const payload = verifyToken<DeleteToken>(input.token)
    if (!payload || payload.purpose !== 'delete' || payload.identityId !== id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'token invalid or expired' })
    await deletePhotoFilesOfIdentity(id) // the files first: the cascade below drops the Asset rows the file names come from
    await ctx.db.identity.delete({ where: { id } }) // cascade: passkeys, email codes, filter, sightings (and their photos), studies, assets owned
    ctx.setCookie(IDENTITY_COOKIE, '', { maxAge: 0 })
    return { step: 'done' as const }
  }),
})
