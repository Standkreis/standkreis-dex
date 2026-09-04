import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/routers/_app'
import { createContext, IDENTITY_COOKIE } from '@/server/trpc'

// The only API. Left out of the static export (next.config.ts), where the client talks to NEXT_PUBLIC_API_URL instead.
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    responseMeta: ({ ctx }) =>
      ctx?.minted
        ? { headers: { 'set-cookie': `${IDENTITY_COOKIE}=${ctx.identity.id}; Path=/; Max-Age=34560000; HttpOnly; SameSite=Lax` } }
        : {},
  })

export { handler as GET, handler as POST }
