import { publicProcedure, router } from '../trpc'

export const identityRouter = router({
  // Who am I. The cookie is set by the route handler when the identity was minted on this request.
  me: publicProcedure.query(({ ctx }) => ({ id: ctx.identity.id, createdAt: ctx.identity.createdAt, anonymous: ctx.identity.credential === null })),
})
