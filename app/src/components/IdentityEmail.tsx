'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useTRPC } from '@/trpc/client'
import { Sheet, useSheetClose } from './Sheet'

export type EmailVerified = { adopted: boolean; merged?: { sightingsMerged: number; sightingsDropped: number; studiesMerged: number }; email: string }
const RESEND_AFTER = 60 // seconds before "Neuen Code" comes back

// The server's refusals (identity.ts emailStart/emailVerify) as lines a person can act on; anything else is the generic error.
const reasonOf = (e: unknown): string => {
  const m = e instanceof Error ? e.message : ''
  if (m.includes('wrong code')) return 'wrongCode'
  if (m.includes('code dead')) return 'codeDead'
  if (m.includes('code expired')) return 'codeExpired'
  if (m.includes('no live code')) return 'noCode'
  if (m.includes('too many codes')) return 'tooMany'
  if (m.includes('mail not sent')) return 'notSent'
  if (m.includes('remove your address')) return 'removeFirst'
  return 'error'
}

/**
 * The email attach (handoff 0020 E6), the same two steps in the settings row and in the sign-in sheet: an address and
 * "Code schicken", then the six-digit field (`inputmode=numeric`, `autocomplete=one-time-code` so iOS offers the code
 * from Mail), "Neuen Code" after 60 s. `onVerified` gets the server's answer: `adopted` with the merge counts when the
 * address belonged to another identity, else the address now on this one.
 */
export function EmailForm({ onVerified, onCancel }: { onVerified: (r: EmailVerified) => void; onCancel?: () => void }) {
  const t = useTranslations('settings.email')
  const tc = useTranslations('common')
  const trpc = useTRPC()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [left, setLeft] = useState(0)
  const [reason, setReason] = useState<string | null>(null)
  const start = useMutation(trpc.identity.emailStart.mutationOptions())
  const verify = useMutation(trpc.identity.emailVerify.mutationOptions())
  const busy = start.isPending || verify.isPending

  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  const send = async () => {
    setReason(null)
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setReason('invalidAddress')
    try {
      const r = await start.mutateAsync({ email: address })
      setSentTo(r.sentTo); setCode(''); setLeft(RESEND_AFTER)
    } catch (e) { setReason(reasonOf(e)) }
  }
  const confirm = async () => {
    setReason(null)
    try {
      const r = await verify.mutateAsync({ code })
      onVerified(r)
    } catch (e) { setReason(reasonOf(e)); setCode('') }
  }
  const line = reason === 'error' ? tc('error') : reason ? t(reason) : null
  const field = 'w-full rounded-2xl bg-paper px-4 py-3 text-[17px] outline-none focus:ring-2 focus:ring-moss'

  return (
    <div className="flex flex-col gap-2" data-testid="email-form" data-state={sentTo ? 'sent' : 'entering'}>
      {sentTo ? (
        <>
          <p className="text-[13px] text-ink-soft" data-testid="email-sent">{t('sent', { email: sentTo })}</p>
          <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder={t('code')} value={code} autoFocus
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) void confirm() }}
            data-testid="email-code" className={`${field} text-center text-[24px] tracking-[0.3em] tabular-nums`} />
          <button type="button" onClick={confirm} disabled={busy || code.length !== 6} data-testid="email-verify" className="w-full rounded-2xl bg-moss px-4 py-3 text-[17px] font-bold text-white disabled:opacity-50">
            {verify.isPending ? tc('working') : t('verify')}
          </button>
          <div className="flex justify-between text-[13px] text-ink-soft">
            <button type="button" onClick={() => { setSentTo(null); setReason(null) }} className="underline" data-testid="email-back">{t('changeAddress')}</button>
            {left > 0
              ? <span data-testid="email-resend-wait">{t('resendIn', { s: left })}</span>
              : <button type="button" onClick={send} disabled={busy} className="underline disabled:opacity-50" data-testid="email-resend">{t('resend')}</button>}
          </div>
        </>
      ) : (
        <>
          <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder={t('address')} value={email} autoFocus
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void send() }} data-testid="email-address" className={field} />
          <button type="button" onClick={send} disabled={busy || !email.trim()} data-testid="email-send" className="w-full rounded-2xl bg-moss px-4 py-3 text-[17px] font-bold text-white disabled:opacity-50">
            {start.isPending ? tc('working') : t('send')}
          </button>
          {onCancel && <button type="button" onClick={onCancel} className="text-[13px] text-ink-soft underline" data-testid="email-cancel">{t('cancel')}</button>}
        </>
      )}
      {line && <p className="text-[13px] text-amber" role="alert" data-testid="email-error">{line}</p>}
    </div>
  )
}

/**
 * The sign-in sheet (handoff 0020 E6): "Schon einen Passkey oder eine E-Mail?" opens it with the two ways to adopt an
 * identity on this device. The passkey runs the caller's flow (the browser's own dialog); the email runs the form here.
 */
export function SignInSheet({ onPasskey, onVerified, onClose }: { onPasskey: () => Promise<void>; onVerified: (r: EmailVerified) => void; onClose: () => void }) {
  const t = useTranslations('settings.identity')
  return (
    <Sheet onClose={onClose} labelledBy="signin-title" testId="signin-sheet" handle={<h2 id="signin-title" className="mt-3 text-[20px] font-bold">{t('signInTitle')}</h2>}>
      <SignInBody onPasskey={onPasskey} onVerified={onVerified} />
    </Sheet>
  )
}

function SignInBody({ onPasskey, onVerified }: { onPasskey: () => Promise<void>; onVerified: (r: EmailVerified) => void }) {
  const t = useTranslations('settings.identity')
  const close = useSheetClose()
  const [byEmail, setByEmail] = useState(false)
  return (
    <div className="px-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
      <p className="mt-1 text-[15px] text-ink-soft">{t('signInHint')}</p>
      {byEmail ? (
        <div className="mt-4"><EmailForm onVerified={(r) => { close(); onVerified(r) }} onCancel={() => setByEmail(false)} /></div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" onClick={() => { close(); void onPasskey() }} data-testid="signin-passkey" className="rounded-2xl bg-moss px-4 py-3 text-[17px] font-bold text-white">{t('signInPasskey')}</button>
          <button type="button" onClick={() => setByEmail(true)} data-testid="signin-email" className="rounded-2xl bg-tile px-4 py-3 text-[17px] font-semibold">{t('signInEmail')}</button>
        </div>
      )}
    </div>
  )
}
