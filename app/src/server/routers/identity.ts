import { TRPCError } from '@trpc/server'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server'
import { z } from 'zod'
import { Tile } from '@/generated/prisma/enums'
import { IDENTITY_COOKIE, IDENTITY_COOKIE_MAX_AGE, publicProcedure, router, type Context } from '../trpc'
import { deletePhoto, photoUrl } from '../photos'
import { expectedOrigin, issueChallenge, rpID, rpName, takeChallenge } from '../webauthn'

// The WebAuthn response shapes come from the browser library; zod only checks the envelope, simplewebauthn checks the rest.
const registrationResponse = z.custom<RegistrationResponseJSON>((v) => typeof v === 'object' && v !== null && 'id' in v && 'response' in v)
const authenticationResponse = z.custom<AuthenticationResponseJSON>((v) => typeof v === 'object' && v !== null && 'id' in v && 'response' in v)

const deviceSelect = { id: true, deviceName: true, createdAt: true, lastUsedAt: true } as const

/// Adoption (handoff 0006 Track B): `from` (this device's anonymous identity) folds into `into` (the identity the passkey belongs to).
/// Sightings and studies merge by [taxonId, at] resp. [taxonId]; duplicates are dropped; assets owned move along; `from` is deleted.
async function mergeIdentities(db: Context['db'], fromId: string, intoId: string) {
  return db.$transaction(async (tx) => {
    const [from, into] = await Promise.all([
      tx.identity.findUniqueOrThrow({ where: { id: fromId }, include: { sightings: { select: { id: true, taxonId: true, at: true } }, studies: true, filter: true } }),
      tx.identity.findUniqueOrThrow({ where: { id: intoId }, include: { sightings: { select: { taxonId: true, at: true } }, studies: true, filter: true } }),
    ])

    // Sightings: same taxon at the same instant is the same encounter logged twice.
    const seen = new Set(into.sightings.map((s) => `${s.taxonId}|${s.at.toISOString()}`))
    const keep = from.sightings.filter((s) => !seen.has(`${s.taxonId}|${s.at.toISOString()}`))
    const dropSightings = from.sightings.filter((s) => seen.has(`${s.taxonId}|${s.at.toISOString()}`))
    if (dropSightings.length) await tx.sighting.deleteMany({ where: { id: { in: dropSightings.map((s) => s.id) } } })
    if (keep.length) await tx.sighting.updateMany({ where: { id: { in: keep.map((s) => s.id) } }, data: { identityId: intoId } })

    // Studies: one per taxon and identity. On a clash keep the earlier `at` and a passed recap from either side.
    const intoStudies = new Map(into.studies.map((s) => [s.taxonId, s]))
    let studiesMerged = 0
    for (const s of from.studies) {
      const existing = intoStudies.get(s.taxonId)
      if (!existing) {
        await tx.study.update({ where: { id: s.id }, data: { identityId: intoId } })
        studiesMerged++
      } else {
        await tx.study.update({ where: { id: existing.id }, data: { at: s.at < existing.at ? s.at : existing.at, recapPassed: existing.recapPassed || s.recapPassed } })
        await tx.study.delete({ where: { id: s.id } })
      }
    }

    // Assets owned (user photos) follow their owner. The filter and the name only fill a gap on the adopted side.
    await tx.asset.updateMany({ where: { ownerId: fromId }, data: { ownerId: intoId } })
    if (from.filter && !into.filter) await tx.filter.update({ where: { id: from.filter.id }, data: { identityId: intoId } })
    if (from.displayName && !into.displayName) await tx.identity.update({ where: { id: intoId }, data: { displayName: from.displayName } })
    // The avatar too (0014 P2): the asset already moved with `ownerId`; without this it would be an orphan for the sweep.
    if (from.avatarAssetId && !into.avatarAssetId) await tx.identity.update({ where: { id: intoId }, data: { avatarAssetId: from.avatarAssetId } })

    await tx.identity.delete({ where: { id: fromId } }) // cascades whatever is left: filter, duplicate rows already gone
    return { sightingsMerged: keep.length, sightingsDropped: dropSightings.length, studiesMerged }
  })
}

export const identityRouter = router({
  // Who am I. The cookie is set by the route handler when the identity was minted on this request.
  // Anonymous = no passkey attached yet (handoff 0006 step 0).
  me: publicProcedure.query(async ({ ctx }) => {
    const [devices, filter] = await Promise.all([
      ctx.db.passkey.count({ where: { identityId: ctx.identity.id } }),
      ctx.db.filter.findUnique({ where: { identityId: ctx.identity.id }, include: { region: { select: { id: true, name: true, status: true } } } }),
    ])
    // The identity's regions (handoff 0018 R2) in the order they were added; the active one is `region`.
    const rows = filter?.regionIds.length ? await ctx.db.region.findMany({ where: { id: { in: filter.regionIds } }, select: { id: true, name: true, status: true } }) : []
    const byId = new Map(rows.map((r) => [r.id, r]))
    const regions = (filter?.regionIds ?? []).flatMap((id) => byId.get(id) ?? [])
    return {
      id: ctx.identity.id,
      createdAt: ctx.identity.createdAt,
      anonymous: devices === 0,
      devices,
      displayName: ctx.identity.displayName,
      avatarUrl: ctx.identity.avatarAssetId ? photoUrl(ctx.identity.avatarAssetId) : null,
      region: filter?.region ?? null,
      regionIds: regions.map((r) => r.id),
      regions,
    }
  }),

  // The two axes over the set (spec §🧬): studied and wild-seen taxon ids, plus the filter's tiles (empty = all).
  // Du intersects them with `dex.set`; M5's grid joins the same lists per cell. `seenAt` carries the latest wild
  // sighting per taxon for the grid's "Zuletzt entdeckt" sort.
  progress: publicProcedure.query(async ({ ctx }) => {
    const [studies, sightings, filter] = await Promise.all([
      ctx.db.study.findMany({ where: { identityId: ctx.identity.id }, select: { taxonId: true } }),
      ctx.db.sighting.groupBy({ by: ['taxonId'], where: { identityId: ctx.identity.id, wildness: 'wild' }, _max: { at: true } }),
      ctx.db.filter.findUnique({ where: { identityId: ctx.identity.id }, select: { tiles: true } }),
    ])
    return {
      studied: studies.map((s) => s.taxonId),
      seen: sightings.map((s) => s.taxonId),
      seenAt: Object.fromEntries(sightings.map((s) => [s.taxonId, s._max.at?.toISOString() ?? ''])) as Record<string, string>,
      tiles: filter?.tiles ?? [],
    }
  }),

  // Name and photo are yours (spec §⚖️): local to the identity, never in a payload before a passkey exists.
  setName: publicProcedure.input(z.object({ displayName: z.string().trim().max(40) })).mutation(({ ctx, input }) =>
    ctx.db.identity.update({ where: { id: ctx.identity.id }, data: { displayName: input.displayName || null }, select: { displayName: true } }),
  ),

  // The profile photo (handoff 0014 P2). The client crops it square (≤ 256 px JPEG) and uploads it through POST /api/photo
  // like a sighting photo; this binds the unattached Asset to the identity. The previous avatar (row and file) goes with
  // it, so an identity never owns more than one, and `null` takes the photo off again. Shown in the profile, nowhere else.
  setAvatar: publicProcedure.input(z.object({ assetId: z.string().uuid().nullable() })).mutation(async ({ ctx, input }) => {
    const previous = ctx.identity.avatarAssetId
    if (input.assetId) {
      const asset = await ctx.db.asset.findFirst({ where: { id: input.assetId, origin: 'user', ownerId: ctx.identity.id, sightingId: null }, select: { id: true } })
      if (!asset) throw new TRPCError({ code: 'NOT_FOUND', message: 'not your unattached photo' })
    }
    if (input.assetId === previous) return { avatarUrl: previous ? photoUrl(previous) : null }
    await ctx.db.identity.update({ where: { id: ctx.identity.id }, data: { avatarAssetId: input.assetId } })
    if (previous) await deletePhoto(previous)
    return { avatarUrl: input.assetId ? photoUrl(input.assetId) : null }
  }),

  // The global filter (spec §🏗️): the regions and the active one (handoff 0018 R2), the tiles from onboarding, the "nur
  // jetzt" chip from the drawer. `regionIds` is the identity's list (≥ 1, ready regions only, no duplicates), `regionId`
  // the active one and must be in the list: removing the active region or the last one is refused here as well as in the
  // sheet. `tiles` and `nowOnly` are optional so the sheet can change the list without knowing them, `regionIds` is
  // optional so the grid can write tiles without knowing the list; whatever is absent stays as it is.
  setFilter: publicProcedure
    .input(z.object({
      regionId: z.string().uuid(),
      regionIds: z.array(z.string().uuid()).min(1).max(20).optional(),
      tiles: z.array(z.enum(Object.values(Tile) as [Tile, ...Tile[]])).optional(),
      nowOnly: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // No list given (the grid's tile write): the list stays as it is; a first filter starts with the one region.
      const existing = input.regionIds ? null : await ctx.db.filter.findUnique({ where: { identityId: ctx.identity.id }, select: { regionIds: true } })
      const regionIds = [...new Set(input.regionIds ?? (existing?.regionIds.length ? existing.regionIds : [input.regionId]))]
      if (!regionIds.includes(input.regionId)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'the active region must be in the list' })
      const ready = await ctx.db.region.count({ where: { id: { in: regionIds }, status: 'ready' } })
      if (ready !== regionIds.length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'only ready regions' })
      return ctx.db.filter.upsert({
        where: { identityId: ctx.identity.id },
        create: { identityId: ctx.identity.id, regionId: input.regionId, regionIds, tiles: input.tiles ?? [], nowOnly: input.nowOnly ?? false },
        update: { regionId: input.regionId, regionIds, ...(input.tiles ? { tiles: input.tiles } : {}), ...(input.nowOnly !== undefined ? { nowOnly: input.nowOnly } : {}) },
        select: { regionId: true, regionIds: true, tiles: true, nowOnly: true },
      })
    }),

  // The one-tap switch (handoff 0018 R2): the active region becomes another one of the list. Nothing else changes.
  setRegion: publicProcedure.input(z.object({ regionId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const filter = await ctx.db.filter.findUnique({ where: { identityId: ctx.identity.id }, select: { id: true, regionIds: true } })
    if (!filter) throw new TRPCError({ code: 'NOT_FOUND', message: 'no filter yet' })
    if (!filter.regionIds.includes(input.regionId)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'not one of your regions' })
    return ctx.db.filter.update({ where: { id: filter.id }, data: { regionId: input.regionId }, select: { regionId: true, regionIds: true } })
  }),

  // ── Passkeys ────────────────────────────────────────────────────────────────
  registerOptions: publicProcedure.mutation(async ({ ctx }) => {
    const passkeys = await ctx.db.passkey.findMany({ where: { identityId: ctx.identity.id }, select: { credentialId: true, transports: true } })
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(ctx.identity.id),
      userName: `dex-${ctx.identity.id.slice(0, 8)}`,
      userDisplayName: ctx.identity.displayName ?? 'Dex',
      attestationType: 'none',
      excludeCredentials: passkeys.map((p) => ({ id: p.credentialId, transports: p.transports })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
    })
    issueChallenge(ctx, 'register', options.challenge)
    return options
  }),

  registerVerify: publicProcedure
    .input(z.object({ response: registrationResponse, deviceName: z.string().trim().max(60).optional() }))
    .mutation(async ({ ctx, input }) => {
      const challenge = takeChallenge(ctx, 'register')
      if (!challenge) throw new TRPCError({ code: 'BAD_REQUEST', message: 'challenge missing or expired' })
      const { verified, registrationInfo } = await verifyRegistrationResponse({
        response: input.response,
        expectedChallenge: challenge,
        expectedOrigin: expectedOrigin(ctx),
        expectedRPID: rpID,
        requireUserVerification: false, // userVerification is "preferred"
      })
      if (!verified) throw new TRPCError({ code: 'BAD_REQUEST', message: 'registration not verified' })
      const { credential } = registrationInfo
      const passkey = await ctx.db.passkey.create({
        data: {
          identityId: ctx.identity.id,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports ?? [],
          deviceName: input.deviceName ?? null,
          lastUsedAt: new Date(),
        },
        select: deviceSelect,
      })
      return { passkey, devices: await ctx.db.passkey.count({ where: { identityId: ctx.identity.id } }) }
    }),

  authenticateOptions: publicProcedure.mutation(async ({ ctx }) => {
    // Resident keys: no allowCredentials, the authenticator offers what it has for this rpID.
    const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred', allowCredentials: [] })
    issueChallenge(ctx, 'authenticate', options.challenge)
    return options
  }),

  // Authenticating with a passkey that belongs to another identity ADOPTS that identity on this device (record Q3: one identity, many devices).
  authenticateVerify: publicProcedure.input(z.object({ response: authenticationResponse })).mutation(async ({ ctx, input }) => {
    const challenge = takeChallenge(ctx, 'authenticate')
    if (!challenge) throw new TRPCError({ code: 'BAD_REQUEST', message: 'challenge missing or expired' })
    const passkey = await ctx.db.passkey.findUnique({ where: { credentialId: input.response.id } })
    if (!passkey) throw new TRPCError({ code: 'NOT_FOUND', message: 'unknown passkey' })
    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: challenge,
      expectedOrigin: expectedOrigin(ctx),
      expectedRPID: rpID,
      credential: { id: passkey.credentialId, publicKey: new Uint8Array(passkey.publicKey), counter: passkey.counter, transports: passkey.transports },
      requireUserVerification: false,
    })
    if (!verified) throw new TRPCError({ code: 'BAD_REQUEST', message: 'authentication not verified' })
    await ctx.db.passkey.update({ where: { id: passkey.id }, data: { counter: authenticationInfo.newCounter, lastUsedAt: new Date() } })

    if (passkey.identityId === ctx.identity.id) return { id: ctx.identity.id, adopted: false as const }
    const merged = await mergeIdentities(ctx.db, ctx.identity.id, passkey.identityId)
    ctx.setCookie(IDENTITY_COOKIE, passkey.identityId, { maxAge: IDENTITY_COOKIE_MAX_AGE })
    return { id: passkey.identityId, adopted: true as const, merged }
  }),

  devices: publicProcedure.query(({ ctx }) =>
    ctx.db.passkey.findMany({ where: { identityId: ctx.identity.id }, orderBy: { createdAt: 'asc' }, select: deviceSelect }),
  ),

  remove: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const { count } = await ctx.db.passkey.deleteMany({ where: { id: input.id, identityId: ctx.identity.id } })
    if (!count) throw new TRPCError({ code: 'NOT_FOUND' })
    return { devices: await ctx.db.passkey.count({ where: { identityId: ctx.identity.id } }) }
  }),
})
