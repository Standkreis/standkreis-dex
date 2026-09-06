import { join } from 'node:path'
import { z } from 'zod'

// The environment, read once (handoff 0010 Track B). Production is strict: a server that starts without a secret would
// sign every passkey challenge with the dev secret, so it does not start. `next build` also runs with NODE_ENV=production
// (and the Dockerfile builds without a .env); the build phase is exempt, the guard fires when the server comes up
// (instrumentation.ts imports this module first). Dev and test fall back to the laptop values in .env.example.
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
export const isProduction = process.env.NODE_ENV === 'production' && !isBuild

const required = z.string().trim().min(1)
const strict = z.object({
  DATABASE_URL: required,
  WEBAUTHN_RP_ID: required,
  WEBAUTHN_ORIGIN: required, // the full https origin(s), comma-separated
  WEBAUTHN_SECRET: z.string().trim().min(32, 'at least 32 characters: openssl rand -hex 32'),
  PHOTO_DIR: z.string().trim().transform((s) => s || undefined).optional(), // required unless photos go to Blob (below)
  BLOB_READ_WRITE_TOKEN: z.string().trim().transform((s) => s || undefined).optional(), // set: photos in Vercel Blob (handoff 0011 A)
  CRON_SECRET: z.string().trim().min(1).optional(), // guards /api/cron/sweep (handoff 0011 Track B); unset: the route refuses
  ANTHROPIC_API_KEY: required, // the scan (handoff 0016 Track A): `sighting.identify` proxies to the Messages API; never in the client bundle
  ANTHROPIC_BASE_URL: z.string().trim().transform((s) => s || undefined).optional(), // checks only: a stub in place of api.anthropic.com
}).superRefine((e, ctx) => {
  if (!e.PHOTO_DIR && !e.BLOB_READ_WRITE_TOKEN) ctx.addIssue({ code: 'custom', path: ['PHOTO_DIR'], message: 'not set (or set BLOB_READ_WRITE_TOKEN to store photos in Vercel Blob)' })
})
const lenient = z.object({
  DATABASE_URL: z.string().trim().min(1).default('postgresql://dex:dex@localhost:5433/dex'),
  WEBAUTHN_RP_ID: z.string().trim().min(1).default('localhost'),
  WEBAUTHN_ORIGIN: z.string().trim().transform((s) => s || undefined).optional(), // unset: trust the request's localhost origin
  WEBAUTHN_SECRET: z.string().trim().min(1).default('dev-only-secret-set-WEBAUTHN_SECRET-in-production'),
  PHOTO_DIR: z.string().trim().min(1).default(join(process.cwd(), 'data', 'photos')),
  BLOB_READ_WRITE_TOKEN: z.string().trim().transform((s) => s || undefined).optional(), // set: photos in Vercel Blob instead of PHOTO_DIR
  CRON_SECRET: z.string().trim().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().trim().transform((s) => s || undefined).optional(), // unset in dev: identify answers PRECONDITION_FAILED
  ANTHROPIC_BASE_URL: z.string().trim().transform((s) => s || undefined).optional(),
})

export type Env = z.infer<typeof strict> & z.infer<typeof lenient>

function read(): Env {
  const source = {
    DATABASE_URL: process.env.DATABASE_URL,
    WEBAUTHN_RP_ID: process.env.WEBAUTHN_RP_ID,
    WEBAUTHN_ORIGIN: process.env.WEBAUTHN_ORIGIN,
    WEBAUTHN_SECRET: process.env.WEBAUTHN_SECRET,
    PHOTO_DIR: process.env.PHOTO_DIR,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  }
  const parsed = (isProduction ? strict : lenient).safeParse(source)
  if (parsed.success) return parsed.data as Env
  const lines = parsed.error.issues.map((i) => `  ${i.path.join('.') || '?'}: ${i.message === 'Invalid input: expected string, received undefined' ? 'not set' : i.message === 'Too small: expected string to have >=1 characters' ? 'empty' : i.message}`)
  const message = `[env] refusing to start, the environment is incomplete:\n${lines.join('\n')}\nSee app/.env.example.`
  if (isProduction) {
    console.error(message)
    process.exit(1) // fail fast: an uncaught throw inside Next's instrumentation is logged and the server would serve on
  }
  throw new Error(message)
}

export const env: Env = read()
