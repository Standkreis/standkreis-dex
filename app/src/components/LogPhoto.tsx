'use client'

import { useState, type ChangeEvent, type Ref } from 'react'

export type Photo = { id: string; url: string }
export type PhotoState = 'idle' | 'busy' | 'error'

const api = process.env.NEXT_PUBLIC_API_URL ?? ''
/** A photo Asset's url is same-origin (`/api/photo/<id>`); the static export prefixes the API host. Reference images are absolute already. */
export const photoSrc = (url: string) => (url.startsWith('/') ? `${api}${url}` : url)

const LONG_EDGE = 1600
const QUALITY = 0.85

/**
 * The picture, resized to 1,600 px on the long edge and re-encoded as JPEG through a canvas (handoff 0008 Track A).
 * A canvas holds pixels only, so EXIF and with it the GPS position never leave the device; the orientation tag is
 * applied before it is dropped (`imageOrientation: 'from-image'`), so the upload is upright.
 */
export async function shrinkToJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY))
  if (!blob) throw new Error('encode failed')
  return blob
}

/** Multipart POST /api/photo → the unattached Asset. The cookie identity owns it; `sighting.create` or `attachPhoto` binds it. */
export async function uploadPhoto(blob: Blob): Promise<Photo> {
  const form = new FormData()
  form.append('file', blob, 'photo.jpg')
  const r = await fetch(`${api}/api/photo`, { method: 'POST', body: form, credentials: 'include' })
  if (!r.ok) throw new Error(`upload ${r.status}`)
  return (await r.json()) as Photo
}

/**
 * The hidden file input behind every "Foto" button: `camera` opens the camera on a phone (`capture`), `gallery` the
 * picker (which on phones offers the camera too). Persistent in the DOM, so a test can set its files. The caller
 * clicks it through the ref inside the user's tap.
 */
export function PhotoInput({ source, onPhoto, onState, testId, ref }: { source: 'camera' | 'gallery'; onPhoto: (p: Photo) => void; onState?: (s: PhotoState) => void; testId: string; ref: Ref<HTMLInputElement> }) {
  const [, setBusy] = useState(false)
  const change = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    onState?.('busy')
    try {
      onPhoto(await uploadPhoto(await shrinkToJpeg(file)))
      onState?.('idle')
    } catch {
      onState?.('error')
    } finally {
      setBusy(false)
    }
  }
  return <input ref={ref} type="file" accept="image/*" {...(source === 'camera' ? { capture: 'environment' } : {})} onChange={change} className="hidden" data-testid={testId} tabIndex={-1} aria-hidden />
}
