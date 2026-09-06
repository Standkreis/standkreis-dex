'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useTRPC } from '@/trpc/client'
import { Sheet, useSheetClose } from './Sheet'

// Doubt 33: two steps, the first names what goes ("2 Geräte · 14 Sichtungen"), the second goes. Never "only here".
export function IdentityDeleteSheet({ onClose }: { onClose: (deleted: boolean) => void }) {
  const t = useTranslations('settings.data')
  return (
    <Sheet onClose={() => onClose(false)} labelledBy="delete-title" handle={<h2 id="delete-title" className="mt-3 text-[20px] font-bold">{t('deleteTitle')}</h2>}>
      <DeleteBody onDeleted={() => onClose(true)} />
    </Sheet>
  )
}

// After the second step the data is gone and the page changes under the sheet: no leave animation, the caller unmounts at once.
function DeleteBody({ onDeleted }: { onDeleted: () => void }) {
  const t = useTranslations('settings.data')
  const close = useSheetClose()
  const tc = useTranslations('common')
  const trpc = useTRPC()
  const qc = useQueryClient()
  const [prepared, setPrepared] = useState<{ devices: number; sightings: number; token: string } | null>(null)
  const del = useMutation(
    trpc.data.delete.mutationOptions({
      onSuccess: (r) => {
        if (r.step === 'confirm') setPrepared(r)
        else { qc.clear(); onDeleted() }
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
    <div className="px-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
      <p className="mt-2 text-[17px] font-semibold" data-testid="delete-summary">
        {prepared ? t('deleteSummary', { devices: prepared.devices, sightings: prepared.sightings }) : tc('working')}
      </p>
      <p className="mt-2 text-[15px] text-ink-soft">{t('deleteBody')}</p>
      {del.isError && <p className="mt-2 text-[13px] text-amber">{tc('error')}</p>}
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" disabled={!prepared || del.isPending} onClick={() => prepared && del.mutate({ token: prepared.token })} data-testid="delete-confirm" className="rounded-2xl bg-ink px-4 py-3 text-[17px] font-bold text-paper disabled:opacity-50">
          {t('deleteConfirm')}
        </button>
        <button type="button" onClick={close} className="rounded-2xl bg-tile px-4 py-3 text-[17px] font-semibold">{t('deleteCancel')}</button>
      </div>
    </div>
  )
}
