import { publicProcedure, router } from '../trpc'

export const identityRouter = router({
  // Who am I. The cookie is set by the route handler when the identity was minted on this request.
  // Anonymous = no passkey attached yet (handoff 0006 step 0).
  me: publicProcedure.query(async ({ ctx }) => ({
    id: ctx.identity.id,
    createdAt: ctx.identity.createdAt,
    anonymous: (await ctx.db.passkey.count({ where: { identityId: ctx.identity.id } })) === 0,
  })),
})
