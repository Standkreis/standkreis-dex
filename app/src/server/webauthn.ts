import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Context } from './trpc'

// ── Relying party ─────────────────────────────────────────────────────────────
// Passkeys are bound to a domain (handoff 0006 §❓). Dev is `localhost` on any port; production reads both from env.
// WEBAUTHN_RP_ID   the bare domain, e.g. dex.example.org
// WEBAUTHN_ORIGIN  the full origin(s), comma-separated, e.g. https://dex.example.org
export const rpName = 'Dex'
export const rpID = process.env.WEBAUTHN_RP_ID ?? 'localhost'

export function expectedOrigin(ctx: Pick<Context, 'origin'>): string | string[] {
  const configured = process.env.WEBAUTHN_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean)
  if (configured?.length) return configured
  // Dev: trust the request's own origin as long as it is localhost, so `next dev -p 3001` and 3002 both work.
  if (ctx.origin && /^https?:\/\/localhost(:\d+)?$/.test(ctx.origin)) return ctx.origin
  return 'http://localhost:3000'
}

// ── Signed tokens ─────────────────────────────────────────────────────────────
// The challenge is not a table (handoff 0006: step 0's migration is final). It travels in a short-lived signed cookie.
// The same signing serves the delete token. Payload is base64url JSON, signature is HMAC-SHA256 over it.
const secret = process.env.WEBAUTHN_SECRET ?? 'dev-only-secret-set-WEBAUTHN_SECRET-in-production'
if (process.env.NODE_ENV === 'production' && !process.env.WEBAUTHN_SECRET) console.warn('WEBAUTHN_SECRET is not set; tokens are signed with the dev secret')

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url')
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8')
const mac = (body: string) => createHmac('sha256', secret).update(body).digest('base64url')

export function signToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 }))
  return `${body}.${mac(body)}`
}

export function verifyToken<T extends Record<string, unknown>>(token: string | undefined): (T & { exp: number }) | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 0) return null
  const body = token.slice(0, dot)
  const sig = Buffer.from(token.slice(dot + 1))
  const want = Buffer.from(mac(body))
  if (sig.length !== want.length || !timingSafeEqual(sig, want)) return null
  try {
    const payload = JSON.parse(unb64(body)) as T & { exp: number }
    return typeof payload.exp === 'number' && payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
}

// ── Challenge cookie ──────────────────────────────────────────────────────────
export const CHALLENGE_COOKIE = 'dex_challenge'
export const CHALLENGE_TTL = 300 // 5 minutes, as the handoff says
export type ChallengeKind = 'register' | 'authenticate'
type ChallengePayload = { challenge: string; kind: ChallengeKind; identityId: string }

export function issueChallenge(ctx: Pick<Context, 'setCookie' | 'identity'>, kind: ChallengeKind, challenge: string) {
  const token = signToken({ challenge, kind, identityId: ctx.identity.id } satisfies ChallengePayload, CHALLENGE_TTL)
  ctx.setCookie(CHALLENGE_COOKIE, token, { maxAge: CHALLENGE_TTL, path: '/api/trpc' })
}

/// Reads and consumes the challenge: it is valid once, for one kind, for the identity that asked for it.
export function takeChallenge(ctx: Pick<Context, 'cookies' | 'setCookie' | 'identity'>, kind: ChallengeKind): string | null {
  const payload = verifyToken<ChallengePayload>(ctx.cookies[CHALLENGE_COOKIE])
  ctx.setCookie(CHALLENGE_COOKIE, '', { maxAge: 0, path: '/api/trpc' })
  if (!payload || payload.kind !== kind || payload.identityId !== ctx.identity.id) return null
  return payload.challenge
}

// ── The nudge hook (doubt 31) ─────────────────────────────────────────────────
/// M6 calls this after the first sighting. Until the wording is settled it never offers.
export function shouldOfferPasskey(_identity: { id: string; createdAt: Date }): boolean {
  void _identity
  return false
}
