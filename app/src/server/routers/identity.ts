import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
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
import { sendCode } from '../mail'
import { deletePhoto, photoUrl } from '../photos'
import { expectedOrigin, issueChallenge, rpID, rpName, takeChallenge } from '../webauthn'

// The WebAuthn response shapes come from the browser library; zod only checks the envelope, simplewebauthn checks the rest.
const registrationResponse = z.custom<RegistrationResponseJSON>((v) => typeof v === 'object' && v !== null && 'id' in v && 'response' in v)
const authenticationResponse = z.custom<AuthenticationResponseJSON>((v) => typeof v === 'object' && v !== null && 'id' in v && 'response' in v)

const deviceSelect = { id: true, deviceName: true, createdAt: true, lastUsedAt: true } as const

// The email code (handoff 0020 E2): six digits, hashed at rest, ten minutes, five tries, one live code per identity.
const CODE_TTL_MS = 10 * 60 * 1000
const CODE_MAX_ATTEMPTS = 5
const CODES_PER_ADDRESS_PER_HOUR = 3
const CODES_PER_IDENTITY_PER_DAY = 10
const hashCode = (code: string) => createHash('sha256').update(code).digest('hex')

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
    // The verified address only (handoff 0020 E7): `email` is set together with `emailVerifiedAt` and cleared together.
    const email = ctx.identity.emailVerifiedAt ? ctx.identity.email : null
    return {
      id: ctx.identity.id,
      createdAt: ctx.identity.createdAt,
      anonymous: devices === 0 && !email, // no recovery path at all: neither a passkey nor a verified address
      devices,
      email,
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

  // ── Email (handoff 0020) ────────────────────────────────────────────────────
  // The second recovery path: a code typed into the app, never a link (the installed PWA and Safari do not share cookies).
  // Starting never says whether the address is known; verifying with an address that belongs to another identity adopts
  // that identity here, exactly like `authenticateVerify` (the device's identity folds into the address's, never the reverse).
  emailStart: publicProcedure.input(z.object({ email: z.string().trim().toLowerCase().email().max(254) })).mutation(async ({ ctx, input }) => {
    const now = Date.now()
    const [perAddress, perIdentity] = await Promise.all([
      ctx.db.emailCode.count({ where: { email: input.email, createdAt: { gt: new Date(now - 60 * 60 * 1000) } } }),
      ctx.db.emailCode.count({ where: { identityId: ctx.identity.id, createdAt: { gt: new Date(now - 24 * 60 * 60 * 1000) } } }),
    ])
    if (perAddress >= CODES_PER_ADDRESS_PER_HOUR || perIdentity >= CODES_PER_IDENTITY_PER_DAY) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'too many codes, try again later' })
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(now + CODE_TTL_MS)
    await ctx.db.$transaction([
      ctx.db.emailCode.updateMany({ where: { identityId: ctx.identity.id, usedAt: null }, data: { usedAt: new Date(now) } }), // one live code per identity
      ctx.db.emailCode.create({ data: { identityId: ctx.identity.id, email: input.email, codeHash: hashCode(code), expiresAt, locale: ctx.locale } }),
    ])
    try { await sendCode(input.email, code, ctx.locale) } catch (e) {
      console.error('[mail] send failed:', e instanceof Error ? e.message : e) // the provider's message, never the address
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'mail not sent' })
    }
    return { sentTo: input.email, expiresAt }
  }),

  emailVerify: publicProcedure.input(z.object({ code: z.string().trim().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
    const live = await ctx.db.emailCode.findFirst({ where: { identityId: ctx.identity.id, usedAt: null }, orderBy: { createdAt: 'desc' } })
    if (!live || live.attempts >= CODE_MAX_ATTEMPTS) throw new TRPCError({ code: 'BAD_REQUEST', message: 'no live code' })
    if (live.expiresAt.getTime() < Date.now()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'code expired' })
    const ok = timingSafeEqual(Buffer.from(hashCode(input.code)), Buffer.from(live.codeHash))
    if (!ok) {
      const { attempts } = await ctx.db.emailCode.update({ where: { id: live.id }, data: { attempts: { increment: 1 } }, select: { attempts: true } })
      throw new TRPCError({ code: 'BAD_REQUEST', message: attempts >= CODE_MAX_ATTEMPTS ? 'code dead' : 'wrong code' })
    }
    await ctx.db.emailCode.update({ where: { id: live.id }, data: { usedAt: new Date(), attempts: { increment: 1 } } })

    const owner = await ctx.db.identity.findUnique({ where: { email: live.email }, select: { id: true, emailVerifiedAt: true } })
    if (owner && owner.emailVerifiedAt && owner.id !== ctx.identity.id) {
      // A verified address is never moved or dropped silently (§🔒): this device's own address would go with the merge.
      if (ctx.identity.emailVerifiedAt) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'remove your address first' })
      const merged = await mergeIdentities(ctx.db, ctx.identity.id, owner.id)
      ctx.setCookie(IDENTITY_COOKIE, owner.id, { maxAge: IDENTITY_COOKIE_MAX_AGE })
      return { id: owner.id, adopted: true as const, merged, email: live.email }
    }
    // A reserved-but-unverified `email` on some other row (pre-0020 there was no writer, so this is a guard, not a path).
    if (owner && owner.id !== ctx.identity.id) await ctx.db.identity.update({ where: { id: owner.id }, data: { email: null } })
    await ctx.db.identity.update({ where: { id: ctx.identity.id }, data: { email: live.email, emailVerifiedAt: new Date() } })
    return { id: ctx.identity.id, adopted: false as const, email: live.email }
  }),

  emailRemove: publicProcedure.mutation(async ({ ctx }) => {
    await ctx.db.$transaction([
      ctx.db.identity.update({ where: { id: ctx.identity.id }, data: { email: null, emailVerifiedAt: null } }),
      ctx.db.emailCode.deleteMany({ where: { identityId: ctx.identity.id } }),
    ])
    return { email: null }
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
