import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/routers/_app'
import { createContext } from '@/server/trpc'

// The only API. Left out of the static export (next.config.ts), where the client talks to NEXT_PUBLIC_API_URL instead.
// Every cookie the context or a procedure queued (identity minted, adopted or deleted; WebAuthn challenge) goes out here.
// `maxDuration` (handoff 0011 Track B): on Vercel the region job and the content kick run past the response through
// `waitUntil` (server/jobs.ts); the invocation may live 300 s, not the 60 s default, so a cold region with a slow GBIF lands.
export const maxDuration = 300

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    responseMeta: ({ ctx }) => {
      const headers = new Headers()
      for (const c of ctx?.outCookies ?? []) headers.append('set-cookie', c)
      return { headers }
    },
  })

export { handler as GET, handler as POST }
