'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useTRPC } from '@/trpc/client'

// Doubt 33: two steps, the first names what goes ("2 Geräte · 14 Sichtungen"), the second goes. Never "only here".
export function IdentityDeleteSheet({ onClose }: { onClose: (deleted: boolean) => void }) {
  const t = useTranslations('settings.data')
  const tc = useTranslations('common')
  const trpc = useTRPC()
  const qc = useQueryClient()
  const [prepared, setPrepared] = useState<{ devices: number; sightings: number; token: string } | null>(null)
  const del = useMutation(
    trpc.data.delete.mutationOptions({
      onSuccess: (r) => {
        if (r.step === 'confirm') setPrepared(r)
        else { qc.clear(); onClose(true) }
      },
    }),
  )
  const asked = useRef(false)
  const ask = del.mutate
  useEffect(() => {
    if (asked.current) return
    asked.current = true
    ask(undefined)
  }, [ask])

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={() => onClose(false)} role="presentation">
      <div role="dialog" aria-modal aria-labelledby="delete-title" className="w-full rounded-t-3xl bg-paper px-4 pt-3" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <h2 id="delete-title" className="text-[20px] font-bold">{t('deleteTitle')}</h2>
        <p className="mt-2 text-[17px] font-semibold" data-testid="delete-summary">
          {prepared ? t('deleteSummary', { devices: prepared.devices, sightings: prepared.sightings }) : tc('working')}
        </p>
        <p className="mt-2 text-[15px] text-ink-soft">{t('deleteBody')}</p>
        {del.isError && <p className="mt-2 text-[13px] text-amber">{tc('error')}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" disabled={!prepared || del.isPending} onClick={() => prepared && del.mutate({ token: prepared.token })} data-testid="delete-confirm" className="rounded-2xl bg-ink px-4 py-3 text-[17px] font-bold text-paper disabled:opacity-50">
            {t('deleteConfirm')}
          </button>
          <button type="button" onClick={() => onClose(false)} className="rounded-2xl bg-tile px-4 py-3 text-[17px] font-semibold">{t('deleteCancel')}</button>
        </div>
      </div>
    </div>
  )
}
