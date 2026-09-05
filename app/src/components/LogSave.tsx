'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import type { inferRouterOutputs } from '@trpc/server'
import { useRouter } from '@/i18n/navigation'
import type { AppRouter } from '@/server/routers/_app'
import { useTRPC } from '@/trpc/client'
import { useAtlasSet } from './AtlasCounters'
import { PhotoInput, photoSrc, queuedPhoto, type PhotoState } from './LogPhoto'
import { enqueue, flush, landing, queuedWild, QueueFull, remove as removeRow, useOutbox, type Lead } from './Queue'
import { Thumb, type Card, type DexState } from './SpeciesCard'

type Created = inferRouterOutputs<AppRouter>['sighting']['create']
type FillOut = NonNullable<inferRouterOutputs<AppRouter>['sighting']['fill']>

type Loc = { status: 'idle' | 'asking' | 'granted' | 'denied' } & Partial<{ lat: number; lng: number }>

// datetime-local wants local time without a zone; Date gives UTC ISO. Shift by the offset and cut the seconds.
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/**
 * The save screen (spec §🎨 4, findings 0002 §4 L3): species, when, where, photo slot, note, and the two buttons that ARE
 * the wild/captive answer. The location is asked here, explained before the browser prompt (spec §🎨 1's pattern);
 * refusal leaves lat/lng null. No confirm step: the fill is the confirmation.
 */
export function LogSave({ gbifKey, photoId, fromSpecies }: { gbifKey: number; photoId: string | null; fromSpecies: boolean }) {
  const t = useTranslations('log')
  const tq = useTranslations('queue')
  const ts = useTranslations('species')
  const tc = useTranslations('common')
  const locale = useLocale()
  const format = useFormatter()
  const router = useRouter()
  const trpc = useTRPC()
  const qc = useQueryClient()

  const me = useQuery(trpc.identity.me.queryOptions())
  const region = me.data?.region ?? null
  const { set, progress } = useAtlasSet(region)
  const inSet = set?.species.find((s) => s.gbifKey === gbifKey)
  // Outside the set (E13): taxon.ensure creates or returns the row; guarded so StrictMode's double effect fires it once.
  const ensure = useMutation(trpc.taxon.ensure.mutationOptions())
  const ensured = useRef(false)
  useEffect(() => { if (set && !inSet && !ensured.current) { ensured.current = true; ensure.mutate({ gbifKey }) } }, [set, inSet, gbifKey, ensure])
  const card: Card | null = inSet
    ? { id: inSet.taxonId, gbifKey, sciName: inSet.sciName, names: inSet.names, tile: inSet.tile, lead: inSet.lead?.url ?? null }
    : ensure.data
      ? { id: ensure.data.id, gbifKey, sciName: ensure.data.sciName, names: (ensure.data.commonNames ?? {}) as Record<string, string>, tile: ensure.data.tile, lead: ensure.data.lead }
      : null
  const state: DexState = card && progress ? (progress.seen.includes(card.id) ? 'seen' : progress.studied.includes(card.id) ? 'studied' : 'none') : 'none'
  const name = card ? card.names[locale] ?? card.names.de ?? card.names.en ?? card.sciName : ''

  const [at, setAt] = useState(() => new Date())
  const [note, setNote] = useState('')
  // The photo slot: the id rides in the URL (from the chooser or the search strip), so back and reload keep it.
  const picker = useRef<HTMLInputElement>(null)
  const [photoState, setPhotoState] = useState<PhotoState>('idle')
  const here = (photo: string | null) => `/log?taxon=${gbifKey}${photo ? `&photo=${photo}` : ''}${fromSpecies ? '&from=species' : ''}`
  const removePhoto = useMutation(trpc.sighting.removePhoto.mutationOptions({ onSettled: () => router.replace(here(null)) }))
  // A photo taken without signal is an outbox row, not an Asset: shown from its blob, removed from the box, uploaded by the flush.
  const outbox = useOutbox()
  const local = useMemo(() => queuedPhoto(photoId), [photoId, outbox]) // eslint-disable-line react-hooks/exhaustive-deps -- outbox is the dependency that makes rowOf() fresh
  const localUrl = useMemo(() => (local ? URL.createObjectURL(local.blob) : null), [local])
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl) }, [localUrl])
  const dropPhoto = () => { if (local) void removeRow(local.id).then(() => router.replace(here(null))); else if (photoId) removePhoto.mutate({ photoId }) }

  // Location: if the browser already granted it, take it silently; if it is still a question, explain first and ask on a tap.
  const [loc, setLoc] = useState<Loc>({ status: 'idle' })
  const ask = () => {
    if (!('geolocation' in navigator)) return setLoc({ status: 'denied' })
    setLoc({ status: 'asking' })
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ status: 'granted', lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setLoc({ status: 'denied' }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }
  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then((p) => { if (p.state === 'granted') ask(); else if (p.state === 'denied') setLoc({ status: 'denied' }) }).catch(() => {})
  }, [])
  const place = useQuery(trpc.sighting.place.queryOptions({ lat: loc.lat ?? 0, lng: loc.lng ?? 0 }, { enabled: loc.status === 'granted', staleTime: Infinity }))
  const where = loc.status === 'granted' ? (place.isLoading ? t('locating') : place.data?.place ?? region?.name ?? '') : region?.name ?? ''

  // The save (handoff 0009 Track B): the row goes into the outbox first, then the flush. Online the server answers within
  // the same tick and its `first` decides; without an answer in 3 s the client's `first` (no seenAt for the taxon, no wild
  // row for it in the box) fills the grid, the sheet says "wird gesendet", and the flush lands when the signal is back.
  const [saving, setSaving] = useState<'idle' | 'busy' | 'done'>('idle')
  const [problem, setProblem] = useState<'full' | 'error' | null>(null)
  const go = (r: { id: string; first: boolean; wildness: string }) => {
    // First wild sighting → the grid fills the cell (one fill implementation, handoff §❓); a repeat from the species page goes back there with the toast.
    const again = `again=${r.id}${r.wildness === 'wild' ? '' : '&kept=1'}` // a kept sighting gets its own toast line, never "Wiedergesehen"
    router.replace(r.first ? `/?fill=${r.id}` : fromSpecies ? `/species/${gbifKey}?${again}` : `/?${again}`)
  }
  const save = async (kind: 'wild' | 'kept') => {
    if (!card) return
    // "Gehalten" is captive for animals and fungi, cultivated for plants (schema Wildness; spec §⚖️ wild only).
    const wildness = kind === 'wild' ? 'wild' : card.tile === 'plant' ? 'cultivated' : 'captive'
    const id = crypto.randomUUID()
    const first = wildness === 'wild' && !progress?.seen.includes(card.id) && !queuedWild(outbox, card.id)
    const placeNow = (loc.status === 'granted' ? place.data?.place : null) ?? region?.name ?? null
    const lead: Lead = inSet?.lead ?? null
    const taxon = { id: card.id, gbifKey, sciName: card.sciName, names: card.names, tile: card.tile, lead }
    setSaving('busy')
    setProblem(null)
    try {
      await enqueue({ id, kind: 'sighting', payload: { taxonId: card.id, at: at.toISOString(), lat: loc.lat, lng: loc.lng, note: note.trim() || undefined, wildness, photoId: photoId && !local ? photoId : undefined, photoRow: local?.id, taxon, place: placeNow, first } })
    } catch (e) {
      setProblem(e instanceof QueueFull ? 'full' : 'error')
      setSaving('idle')
      return
    }
    const answer = landing<Created>(id, navigator.onLine ? 3000 : 0)
    void flush()
    const r = await answer
    setSaving('done')
    if (r) return go(r)
    // No answer: seed what the sheet and the toast read, so the grid needs no server. The flush invalidates it when the row lands.
    const photo = local ? { id: local.id, url: URL.createObjectURL(local.blob) } : photoId ? { id: photoId, url: `/api/photo/${photoId}` } : null
    const seeded = { id, offerPasskey: false, at, place: placeNow, wildness, evidence: photo ? 'photographed' : 'claimed', first, photo, taxon, pending: true }
    qc.setQueryData(trpc.sighting.fill.queryKey({ id }), seeded as unknown as FillOut) // `tile` is a string here, an enum there; `photo` may be null on both sides
    go({ id, first, wildness })
  }
  const busy = saving !== 'idle'

  const day = sameDay(at, new Date()) ? `${t('today')}, ${format.dateTime(at, { day: 'numeric', month: 'short' })}` : format.dateTime(at, { weekday: 'short', day: 'numeric', month: 'short' })
  const when = `${day} · ${format.dateTime(at, { hour: '2-digit', minute: '2-digit' })}`
  const cardCls = 'rounded-3xl bg-card shadow-[0_2px_12px_rgba(30,42,35,0.06)]'

  return (
    <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col px-4 pt-3 [&~nav]:hidden" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }} data-testid="log-save">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => (fromSpecies ? router.push(`/species/${gbifKey}`) : router.push(photoId ? `/log?photo=${photoId}` : '/log'))} aria-label={t('back')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-[20px] shadow-[0_2px_12px_rgba(30,42,35,0.06)]">‹</button>
        <h1 className="text-[22px] font-bold tracking-tight">{t('saveTitle')}</h1>
      </div>

      {!card ? (
        <p className="mt-6 text-[15px] text-ink-soft">{ensure.isError ? t('unknown') : tc('working')}</p>
      ) : (
        <>
          <div className={`mt-4 flex items-center gap-4 px-4 py-4 ${cardCls}`} data-testid="save-species">
            <Thumb card={card} state={state} size={56} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[22px] leading-tight font-bold">{name}</div>
              <div className="mt-0.5 text-[15px] text-ink-soft">{name !== card.sciName && <><i>{card.sciName}</i> · </>}{ts(`tile.${card.tile}`)}{!inSet && set && <> · {t('rare')}</>}</div>
            </div>
            <button type="button" onClick={() => router.push(photoId ? `/log?photo=${photoId}` : '/log')} className="shrink-0 text-[15px] font-semibold text-moss-deep">{t('change')}</button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className={`relative block px-4 py-3 ${cardCls}`}>
              <span className="text-[13px] text-ink-soft">{t('when')}</span>
              <span className="mt-1 block text-[17px] leading-tight font-bold" data-testid="save-when">{when}</span>
              <input type="datetime-local" value={toLocalInput(at)} max={toLocalInput(new Date())} onChange={(e) => { const d = new Date(e.target.value); if (!Number.isNaN(d.getTime())) setAt(d) }}
                aria-label={t('when')} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
            <div className={`px-4 py-3 ${cardCls}`} data-testid="save-where">
              <span className="text-[13px] text-ink-soft">{t('where')}</span>
              <span className="mt-1 block text-[17px] leading-tight font-bold">{where || '…'}</span>
              {loc.status === 'granted' ? (
                <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{t('whereSub')}</span>
              ) : loc.status === 'denied' ? (
                <span className="mt-1 block text-[13px] leading-snug text-ink-soft" data-testid="save-denied">{t('locationDenied')}</span>
              ) : (
                <>
                  <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{t('locationWhy')}</span>
                  <button type="button" onClick={ask} disabled={loc.status === 'asking'} className="mt-2 text-[15px] font-semibold text-moss-deep disabled:opacity-60" data-testid="save-locate">
                    {loc.status === 'asking' ? t('locating') : t('useLocation')}
                  </button>
                </>
              )}
            </div>
          </div>

          {photoId ? (
            <div className={`mt-3 flex items-center gap-4 px-4 py-4 ${cardCls}`} data-testid="save-photo" data-photo={photoId}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the identity's own upload */}
              <img src={localUrl ?? photoSrc(`/api/photo/${photoId}`)} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold">{t('photoAttached')}</span>
                <span className="block text-[15px] leading-snug text-ink-soft">{t('photoAttachedSub')}</span>
              </span>
              <button type="button" onClick={dropPhoto} disabled={removePhoto.isPending} className="shrink-0 text-[15px] font-semibold text-ink-soft disabled:opacity-60" data-testid="save-photo-remove">{t('removePhoto')}</button>
            </div>
          ) : (
            <button type="button" onClick={() => picker.current?.click()} disabled={photoState === 'busy'} className={`mt-3 flex w-full items-center gap-4 px-4 py-4 text-left disabled:opacity-60 ${cardCls}`} data-testid="save-photo">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-ink-faint/60 text-[24px]" aria-hidden>📷</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold">{t('noPhotoTitle')}</span>
                <span className={`block text-[15px] leading-snug ${photoState === 'error' ? 'text-amber' : 'text-ink-soft'}`}>{photoState === 'busy' ? t('photoUploading') : photoState === 'error' ? tc('error') : t('noPhotoSub')}</span>
              </span>
              {photoState !== 'busy' && <span className="shrink-0 text-[15px] font-semibold text-moss-deep">{t('addPhoto')}</span>}
            </button>
          )}
          <PhotoInput ref={picker} source="gallery" onPhoto={(p) => router.replace(here(p.id))} onState={setPhotoState} testId="photo-input" />

          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('notePlaceholder')} maxLength={500} data-testid="save-note"
            className={`mt-3 h-13 w-full px-4 text-[17px] outline-none placeholder:text-ink-faint ${cardCls}`} />

          <div className="flex-1" />

          <p className="mt-8 text-center text-[15px] text-ink-soft">{t('wildQuestion')}</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => save('wild')} disabled={busy} data-testid="save-wild"
              className="flex h-20 flex-col items-center justify-center rounded-3xl bg-moss text-white shadow-md disabled:opacity-60">
              <span className="text-[22px] leading-tight font-bold"><span aria-hidden>🌳 </span>{t('wild')}</span>
              <span className="text-[15px] text-white/85">{busy ? t('saving') : t('wildSub')}</span>
            </button>
            <button type="button" onClick={() => save('kept')} disabled={busy} data-testid="save-captive"
              className="flex h-20 flex-col items-center justify-center rounded-3xl bg-card shadow-[0_2px_12px_rgba(30,42,35,0.06)] disabled:opacity-60">
              <span className="text-[22px] leading-tight font-bold"><span aria-hidden>🏠 </span>{t('captive')}</span>
              <span className="px-2 text-center text-[13px] leading-tight text-ink-soft">{t('captiveSub')}</span>
            </button>
          </div>
          <p className="mt-3 text-center text-[13px] leading-snug text-ink-faint">{t('captiveHint')}</p>
          {problem && <p className="mt-2 text-center text-[13px] text-amber" data-testid="save-problem">{problem === 'full' ? tq('full') : tc('error')}</p>}
        </>
      )}
    </main>
  )
}
