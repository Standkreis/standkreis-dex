import { TRPCError } from '@trpc/server'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server'
import { z } from 'zod'
import { IDENTITY_COOKIE, publicProcedure, router, type Context } from '../trpc'
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
    return {
      id: ctx.identity.id,
      createdAt: ctx.identity.createdAt,
      anonymous: devices === 0,
      devices,
      displayName: ctx.identity.displayName,
      region: filter?.region ?? null,
    }
  }),

  // Name and photo are yours (spec §⚖️): local to the identity, never in a payload before a passkey exists.
  setName: publicProcedure.input(z.object({ displayName: z.string().trim().max(40) })).mutation(({ ctx, input }) =>
    ctx.db.identity.update({ where: { id: ctx.identity.id }, data: { displayName: input.displayName || null }, select: { displayName: true } }),
  ),

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
    ctx.setCookie(IDENTITY_COOKIE, passkey.identityId, { maxAge: 34_560_000 })
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
