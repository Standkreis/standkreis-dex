import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { db } from './db'

export const IDENTITY_COOKIE = 'dex_id'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Identity stub (record Q3): every request has a subject. No cookie, or one we do not know → mint a new anonymous identity.
export async function createContext({ req }: { req: Request }) {
  const cookie = req.headers.get('cookie') ?? ''
  const claimed = cookie.split(/;\s*/).find((c) => c.startsWith(`${IDENTITY_COOKIE}=`))?.slice(IDENTITY_COOKIE.length + 1)
  const existing = claimed && uuid.test(claimed) ? await db.identity.findUnique({ where: { id: claimed } }) : null
  const identity = existing ?? (await db.identity.create({ data: {} }))
  return { db, identity, minted: !existing }
}
export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({ transformer: superjson })
export const router = t.router
export const publicProcedure = t.procedure
