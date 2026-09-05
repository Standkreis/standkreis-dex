'use client'

import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFormatter, useNow, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { authenticate, guessDeviceName, register } from './IdentityPasskey'
import { IdentityDeleteSheet } from './IdentityDelete'
import { AppearanceRows } from './Appearance'

const card = 'rounded-3xl bg-card shadow-[0_2px_12px_rgba(30,42,35,0.06)]'
const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-6">
    <h2 className="mb-2 px-1 text-[13px] font-semibold tracking-[0.08em] text-ink-faint uppercase">{title}</h2>
    <div className={`${card} divide-y divide-paper`}>{children}</div>
  </section>
)
const Row = ({ title, hint, value, onClick, testId }: { title: string; hint?: string; value?: string; onClick?: () => void; testId?: string }) => {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <div className="text-[17px]">{title}</div>
        {hint && <div className="mt-0.5 text-[13px] text-ink-soft">{hint}</div>}
      </div>
      {value && <div className="shrink-0 text-[17px] text-ink-soft">{value}</div>}
      {onClick && <span className="shrink-0 text-ink-faint" aria-hidden>›</span>}
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-4 py-3.5 text-left'
  return onClick ? <button type="button" onClick={onClick} data-testid={testId} className={cls}>{inner}</button> : <div className={cls}>{inner}</div>
}

// Einstellungen (findings 0002 §9 minus Dein Kreis and iNaturalist, handoff 0006; Darstellung back in by the owner, 2026-09-05). Boring and findable.
export function IdentitySettings({ version }: { version: string }) {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const fmt = useFormatter()
  const now = useNow()
  const trpc = useTRPC()
  const qc = useQueryClient()
  const me = useQuery(trpc.identity.me.queryOptions())
  const synced = !!me.data && !me.data.anonymous
  const devices = useQuery(trpc.identity.devices.queryOptions(undefined, { enabled: synced }))
  const refresh = () => qc.invalidateQueries()

  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDevices, setShowDevices] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const registerOptions = useMutation(trpc.identity.registerOptions.mutationOptions())
  const registerVerify = useMutation(trpc.identity.registerVerify.mutationOptions({ onSuccess: refresh }))
  const authOptions = useMutation(trpc.identity.authenticateOptions.mutationOptions())
  const authVerify = useMutation(trpc.identity.authenticateVerify.mutationOptions({ onSuccess: refresh }))
  const remove = useMutation(trpc.identity.remove.mutationOptions({ onSuccess: refresh }))
  const busy = registerOptions.isPending || registerVerify.isPending || authOptions.isPending || authVerify.isPending

  const run = async (fn: () => Promise<void>) => {
    setError(null); setNotice(null)
    try { await fn() } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') return // the user closed the passkey dialog
      setError(e instanceof Error && e.message.includes('unknown passkey') ? t('identity.unknownPasskey') : tc('error'))
    }
  }
  const createPasskey = () => run(async () => {
    const options = await registerOptions.mutateAsync()
    const response = await register(options)
    await registerVerify.mutateAsync({ response, deviceName: guessDeviceName() })
  })
  const signIn = () => run(async () => {
    const options = await authOptions.mutateAsync()
    const response = await authenticate(options)
    const r = await authVerify.mutateAsync({ response })
    if (r.adopted) setNotice(t('identity.adopted', { sightings: r.merged.sightingsMerged }))
  })

  const lastUsed = devices.data?.map((d) => d.lastUsedAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0]
  const exportData = () => run(async () => {
    const data = await qc.fetchQuery(trpc.data.export.queryOptions())
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `dex-export-${new Date().toISOString().slice(0, 10)}.json` })
    a.click()
    URL.revokeObjectURL(a.href)
  })

  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-24">
      <div className="relative flex h-10 items-center justify-center">
        <Link href="/you" className="absolute left-0 flex h-9 items-center gap-1 rounded-full bg-tile px-3 text-[15px] text-ink-soft">
          <span aria-hidden>‹</span> {t('back')}
        </Link>
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{t('title')}</h1>
      </div>

      {/* Identity block */}
      <section className={`${card} mt-4 px-4 py-4`} data-testid="identity-card" data-state={synced ? 'synced' : 'local'}>
        <div className="flex gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[20px] ${synced ? 'bg-moss-soft' : 'bg-tile'}`} aria-hidden>{synced ? '☁️' : '📱'}</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold" data-testid="identity-title">{synced ? t('identity.syncedTitle', { n: me.data?.devices ?? 0 }) : t('identity.localTitle')}</h2>
            <p className="mt-0.5 text-[15px] text-ink-soft">
              {synced ? (lastUsed ? t('identity.syncedBody', { when: fmt.relativeTime(lastUsed, { now }) }) : t('identity.syncedBodyNever')) : t('identity.localBody')}
            </p>
          </div>
        </div>
        {synced ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowDevices((v) => !v)} className="rounded-full bg-tile px-3.5 py-2 text-[14px] font-semibold">{t('identity.removeDevice')}</button>
            <button type="button" onClick={createPasskey} disabled={busy} data-testid="passkey-add" className="rounded-full bg-tile px-3.5 py-2 text-[14px] font-semibold disabled:opacity-50">{t('identity.addDevice')}</button>
          </div>
        ) : (
          <>
            <button type="button" onClick={createPasskey} disabled={busy || !me.data} data-testid="passkey-create" className="mt-4 w-full rounded-2xl bg-moss px-4 py-3 text-[17px] font-bold text-white disabled:opacity-50">
              {busy ? tc('working') : t('identity.create')}
            </button>
            <p className="mt-2 text-center text-[13px] text-ink-soft">
              {t('identity.createHint')}{' '}
              <button type="button" onClick={signIn} disabled={busy} data-testid="passkey-signin" className="underline">{t('identity.signIn')}</button>
            </p>
          </>
        )}
        {showDevices && synced && (
          <ul className="mt-3 divide-y divide-paper rounded-2xl bg-paper" data-testid="devices">
            {devices.data?.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px]">{d.deviceName ?? t('identity.unnamedDevice')}</div>
                  <div className="text-[12px] text-ink-soft">{fmt.dateTime(d.createdAt, { dateStyle: 'medium' })}</div>
                </div>
                <button type="button" onClick={() => remove.mutate({ id: d.id })} className="text-[13px] font-semibold text-amber">{t('identity.remove')}</button>
              </li>
            ))}
          </ul>
        )}
        {notice && <p className="mt-3 text-[13px] text-moss-deep" data-testid="notice">{notice}</p>}
        {error && <p className="mt-3 text-[13px] text-amber" role="alert">{error}</p>}
      </section>

      <Group title={t('data.title')}>
        <Row title={t('data.export')} hint={t('data.exportHint')} onClick={exportData} testId="export" />
        <Row title={t('data.delete')} hint={t('data.deleteHint')} onClick={() => setDeleting(true)} testId="delete" />
      </Group>

      <Group title={t('display.title')}>
        <AppearanceRows />
      </Group>

      <Group title={t('about.title')}>
        <Row title={t('about.sources')} hint={t('about.sourcesHint')} />
        <Row title={t('about.version')} value={version} />
      </Group>

      {deleting && <IdentityDeleteSheet onClose={(done) => { setDeleting(false); if (done) setNotice(t('data.deleted')) }} />}
    </main>
  )
}
