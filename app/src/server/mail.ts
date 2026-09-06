import { Resend } from 'resend'
import { env, isProduction } from './env'
import type { Locale } from './locale'

// The one mail the app sends (handoff 0020 E4): the six-digit code that verifies an address. From the atlas, no
// reply-to, no tags; open and click tracking are a domain setting at Resend and stay off there (the mail has no link
// and no pixel to track). RESEND_API_KEY is required in production (env.ts); unset in dev the code goes to the server
// log instead and nothing leaves the machine. RESEND_BASE_URL is read by the SDK itself, for the stub in checks.
export const MAIL_FROM = 'Standkreis Atlas <atlas@standkreis.de>'

const copy: Record<Locale, { subject: (code: string) => string; intro: string; expires: string; ignore: string }> = {
  de: {
    subject: (code) => `${code} ist dein Code für den Atlas`,
    intro: 'Dein Code für den Standkreis Atlas:',
    expires: 'Er gilt zehn Minuten.',
    ignore: 'Wenn du das nicht warst, ignoriere diese Mail.',
  },
  en: {
    subject: (code) => `${code} is your Atlas code`,
    intro: 'Your code for the Standkreis Atlas:',
    expires: 'It is valid for ten minutes.',
    ignore: 'If this was not you, ignore this mail.',
  },
}

export function codeMail(code: string, locale: Locale) {
  const c = copy[locale]
  const text = `${c.intro}\n\n${code}\n\n${c.expires}\n${c.ignore}\n`
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e2a23;background:#f6f4ee">
<p style="margin:0 0 16px;font-size:16px">${c.intro}</p>
<p style="margin:0 0 16px;font-size:40px;font-weight:700;letter-spacing:0.2em;font-variant-numeric:tabular-nums">${code}</p>
<p style="margin:0 0 4px;font-size:14px;color:#5b665f">${c.expires}</p>
<p style="margin:0;font-size:14px;color:#5b665f">${c.ignore}</p>
</body></html>`
  return { subject: c.subject(code), text, html }
}

let client: Resend | null = null

/// Sends the code; throws on a provider error so the caller can answer a typed tRPC error. Never logs the address in production.
export async function sendCode(to: string, code: string, locale: Locale): Promise<void> {
  if (!env.RESEND_API_KEY) {
    if (isProduction) throw new Error('RESEND_API_KEY not set') // env.ts already refused to start; belt and braces
    console.log(`[mail] code for ${to}: ${code}`)
    return
  }
  client ??= new Resend(env.RESEND_API_KEY)
  const { subject, text, html } = codeMail(code, locale)
  const { error } = await client.emails.send({ from: MAIL_FROM, to, subject, text, html })
  if (error) throw new Error(`[mail] ${error.name}: ${error.message}`)
}
