import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import { db } from './db'

export const IDENTITY_COOKIE = 'dex_id'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const parseCookies = (header: string): Record<string, string> =>
  Object.fromEntries(
    header
      .split(/;\s*/)
      .filter(Boolean)
      .map((c) => {
        const i = c.indexOf('=')
        return i < 0 ? [c, ''] : [c.slice(0, i), c.slice(i + 1)]
      }),
  )

export type CookieOptions = { maxAge: number; path?: string }
export const IDENTITY_COOKIE_MAX_AGE = 34_560_000 // 400 days, the cap browsers enforce (handoff 0010 Track B)

// Behind Caddy the request reaches Next as plain http; the proxy says what the phone used. A cookie marked Secure on a
// plain http origin (dev on localhost) would never come back, so the flag follows the actual scheme.
export const isHttps = (req: Request): boolean => {
  const forwarded = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  if (forwarded) return forwarded === 'https'
  try { return new URL(req.url).protocol === 'https:' } catch { return false }
}

// Identity stub (record Q3): every request has a subject. No cookie, or one we do not know → mint a new anonymous identity.
// Procedures that switch the subject (passkey adoption) or end it (data.delete) write cookies through `setCookie`;
// the route handler flushes `outCookies` as Set-Cookie headers (handoff 0006, Track B).
export async function createContext({ req }: { req: Request }) {
  const cookies = parseCookies(req.headers.get('cookie') ?? '')
  const claimed = cookies[IDENTITY_COOKIE]
  const existing = claimed && uuid.test(claimed) ? await db.identity.findUnique({ where: { id: claimed } }) : null
  const identity = existing ?? (await db.identity.create({ data: {} }))
  const outCookies: string[] = []
  const secure = isHttps(req) ? '; Secure' : ''
  const setCookie = (name: string, value: string, { maxAge, path = '/' }: CookieOptions) =>
    outCookies.push(`${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`)
  if (!existing) setCookie(IDENTITY_COOKIE, identity.id, { maxAge: IDENTITY_COOKIE_MAX_AGE })
  return { db, identity, minted: !existing, cookies, setCookie, outCookies, origin: req.headers.get('origin') }
}
export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({ transformer: superjson })
export const router = t.router
export const publicProcedure = t.procedure
