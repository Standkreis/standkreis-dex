'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useTRPC } from '@/trpc/client'
import { Icon } from './Marks'
import { photoSrc, uploadPhoto } from './LogPhoto'

const SIDE = 256
const QUALITY = 0.85

/**
 * The profile photo (handoff 0014 P2): the centre square of the picture, at most 256 px, re-encoded as JPEG through a
 * canvas like a sighting photo (no EXIF, no GPS; orientation applied first). ~15 kB per avatar.
 */
export async function cropToAvatar(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const side = Math.min(bitmap.width, bitmap.height)
  const out = Math.max(1, Math.min(SIDE, side))
  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY))
  if (!blob) throw new Error('encode failed')
  return blob
}

/**
 * The circle on the profile card: the avatar, else the initials, else the silhouette. A tap opens the picker; the
 * upload goes through POST /api/photo (an unattached user Asset) and `identity.setAvatar` binds it, dropping the old one.
 * Online only: the profile is not part of the walk, so no outbox row for it.
 */
export function AvatarButton({ name, initials, avatarUrl }: { name: string | null; initials: string; avatarUrl: string | null }) {
  const t = useTranslations('you')
  const trpc = useTRPC()
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  const setAvatar = useMutation(trpc.identity.setAvatar.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: trpc.identity.me.queryKey() }) }))
  const change = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setState('busy')
    try {
      const photo = await uploadPhoto(await cropToAvatar(file))
      await setAvatar.mutateAsync({ assetId: photo.id })
      setState('idle')
    } catch {
      setState('error')
    }
  }
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={t('avatar')}
        disabled={state === 'busy'}
        data-testid="avatar"
        data-state={state}
        className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-moss-soft text-[22px] font-bold text-moss-deep ${state === 'busy' ? 'opacity-60' : ''}`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- the identity's own upload
          <img src={photoSrc(avatarUrl)} alt={name ?? ''} className="h-full w-full object-cover" data-testid="avatar-image" />
        ) : (
          <span aria-hidden>{initials || <Icon name="you" size={28} />}</span>
        )}
        <span className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full bg-card text-ink-soft shadow-[0_1px_4px_rgba(30,42,35,0.2)]" aria-hidden>
          <Icon name="camera" size={14} />
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" onChange={change} className="hidden" data-testid="avatar-input" tabIndex={-1} aria-hidden />
      {state !== 'idle' && <span className={`text-[11px] ${state === 'error' ? 'text-amber' : 'text-ink-soft'}`} data-testid="avatar-state">{t(state === 'busy' ? 'avatarBusy' : 'avatarError')}</span>}
    </div>
  )
}
