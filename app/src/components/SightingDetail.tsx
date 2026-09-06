'use client'

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { useDayLabel } from './JournalDate'
import { photoSrc, shrinkToJpeg, uploadPhoto, type PhotoState } from './LogPhoto'
import { Icon } from './Marks'
import { ScanInfo } from './LogSheet'
import { enqueue, flush } from './Queue'
import { scanNoteOf } from './Scan'
import { SourceInfo, useImageSource } from './SourceInfo'
import { tileIcon, useName } from './SpeciesCard'
import { SightingMap } from './SightingMap'
import { rememberSpeciesOrigin } from './SpeciesOrigin'
import { Sheet, useSheetClose } from './Sheet'

type Wildness = 'wild' | 'captive' | 'cultivated'

/** A Date as the value of `<input type="datetime-local">` in local time. */
const toLocalInput = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }

/**
 * One sighting (handoff 0008 Track B, redesigned in 0014 T1): the own photo as the hero, else the reference image with a
 * "Referenzfoto" tag and "Foto hinzufügen"; the name; one meta line (date · time · Gemeinde · group), the date tappable
 * to edit it; "Zur Art" as the primary button; then the note, the exact place (spec §⚖️: exact only here), wildness and
 * Löschen. The same component sits in the diary's drawer (`mode` drawer) and on the `/sighting/<id>` route (deep links,
 * persisted offline). `origin` is the path the species page's back button returns to.
 */
export function SightingDetail({ id, mode, origin, onGone }: { id: string; mode: 'page' | 'drawer'; origin: string; onGone: () => void }) {
  const t = useTranslations('sighting')
  const tj = useTranslations('journal')
  const ts = useTranslations('species')
  const tc = useTranslations('common')
  const tsc = useTranslations('scan')
  const format = useFormatter()
  const name = useName()
  const imageSource = useImageSource()
  const { full } = useDayLabel()
  const trpc = useTRPC()
  const qc = useQueryClient()

  const s = useQuery(trpc.journal.get.queryOptions({ id }))
  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: trpc.journal.pathKey() }), qc.invalidateQueries({ queryKey: trpc.identity.progress.queryKey() })])
  const update = useMutation(trpc.journal.update.mutationOptions({ onSuccess: () => invalidate() }))
  const remove = useMutation(trpc.journal.remove.mutationOptions({ onSuccess: async () => { await invalidate(); onGone() } }))
  const attach = useMutation(trpc.sighting.attachPhoto.mutationOptions())

  // The three editable fields are overrides on top of the row; nothing is copied into state, so a refetch needs no effect.
  const [edit, setEdit] = useState<{ note?: string; at?: string; wildness?: Wildness }>({})
  const [editWhen, setEditWhen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  // "Foto hinzufügen": online the JPEG goes up and `attachPhoto` binds it; without signal it waits in the outbox as a
  // `photo` row with `forSighting` (the flush uploads and binds it) and the local blob stands in as the hero meanwhile.
  const [photoState, setPhotoState] = useState<PhotoState>('idle')
  const [queued, setQueued] = useState<string | null>(null)
  const picker = useRef<HTMLInputElement>(null)
  const addPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoState('busy')
    try {
      const blob = await shrinkToJpeg(file)
      if (navigator.onLine) {
        try {
          const p = await uploadPhoto(blob)
          await attach.mutateAsync({ sightingId: id, photoId: p.id })
          await invalidate()
          setPhotoState('idle')
          return
        } catch (err) { if (!(err instanceof TypeError)) throw err } // a TypeError is fetch's "no answer"; a status is the server's
      }
      await enqueue({ id: crypto.randomUUID(), kind: 'photo', payload: { forSighting: id }, blob })
      setQueued(URL.createObjectURL(blob))
      void flush()
      setPhotoState('idle')
    } catch {
      setPhotoState('error')
    }
  }
  const row = s.data
  const scanNote = row?.evidence === 'idAssisted' ? scanNoteOf(id) : null

  if (s.isSuccess && !row) return <Empty text={t('notFound')} link={mode === 'page' ? t('toJournal') : undefined} />
  if (!row) return <Empty text={tc('working')} />

  const note = edit.note ?? row.note ?? '', at = edit.at ?? toLocalInput(row.at), wildness = edit.wildness ?? row.wildness
  const setNote = (v: string) => setEdit((e) => ({ ...e, note: v })), setAt = (v: string) => setEdit((e) => ({ ...e, at: v })), setWildness = (v: Wildness) => setEdit((e) => ({ ...e, wildness: v }))
  const dirty = note.trim() !== (row.note ?? '') || at !== toLocalInput(row.at) || wildness !== row.wildness
  const save = () => update.mutate({ id, note: note.trim() || null, at: new Date(at), wildness }, { onSuccess: () => { setEdit({}); setEditWhen(false) } })
  const reset = () => { setEdit({}); setEditWhen(false) }
  const own = row.photo ? { url: photoSrc(row.photo.url), info: row.photo } : queued ? { url: queued, info: null } : null
  const image = own ?? (row.reference ? { url: row.reference.url, info: row.reference } : null)
  const title = name(row.taxon)
  const chip = row.first ? { text: tj('newlySeen'), cls: 'bg-moss-soft text-moss-deep' } : row.wildness !== 'wild' ? { text: tj(row.wildness), cls: 'bg-tile text-ink-soft' } : null
  const options: Wildness[] = row.wildness === 'cultivated' ? ['wild', 'captive', 'cultivated'] : ['wild', 'captive']
  const shownAt = edit.at ? new Date(edit.at) : row.at
  const meta: ReactNode[] = [
    <button key="when" type="button" onClick={() => setEditWhen((v) => !v)} aria-expanded={editWhen} className="underline decoration-ink-faint decoration-dotted underline-offset-4" data-testid="when">
      {t('dateTime', { day: full(shownAt), time: format.dateTime(shownAt, { hour: '2-digit', minute: '2-digit' }) })}
    </button>,
    row.place ? <span key="place">{row.place}</span> : null,
    <span key="tile">{ts(`tile.${row.taxon.tile}`)}</span>,
  ].filter(Boolean)
  const saveBar = dirty && (
    <div className={mode === 'page' ? 'fixed inset-x-0 z-10' : 'sticky bottom-0 z-10 -mx-4'} style={mode === 'page' ? { bottom: 'env(safe-area-inset-bottom)' } : undefined} data-testid="save-bar">
      <div className="mx-auto flex max-w-[520px] gap-2 bg-gradient-to-t from-paper via-paper/95 to-paper/0 px-4 pt-6 pb-2">
        <button type="button" onClick={reset} className="rounded-full bg-tile px-5 text-[15px] font-semibold text-ink-soft">{t('discard')}</button>
        <button type="button" disabled={update.isPending || !at} onClick={save} data-testid="save" className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-moss text-[17px] font-bold text-white shadow-md disabled:opacity-60">
          <Icon name="journal" size={20} /> {t('save')}
        </button>
      </div>
    </div>
  )

  return (
    <div data-testid="sighting" data-own-photo={!!own}>
      {/* T1: the hero. Own photo in colour; the reference image carries the tag and the action, greyscale when the sighting is not wild. */}
      <figure className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-tile" data-testid="hero">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser
          <img src={image.url} alt="" className={`h-full w-full object-cover ${own || row.wildness === 'wild' ? '' : 'grayscale'}`} data-testid="image" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[64px] text-ink-faint">{tileIcon[row.taxon.tile] ?? '?'}</span>
        )}
        {!own && (
          <>
            <span className="absolute top-3 left-3 rounded-full bg-card/90 px-2.5 py-1 text-[12px] font-semibold text-ink-soft shadow-md backdrop-blur" data-testid="reference-tag">{t('referenceTag')}</span>
            <button type="button" disabled={photoState === 'busy'} onClick={() => picker.current?.click()} data-testid="add-photo"
              className="absolute bottom-3 left-3 flex h-9 items-center gap-1.5 rounded-full bg-card/90 pr-3.5 pl-2.5 text-[14px] font-semibold text-ink shadow-md backdrop-blur disabled:opacity-60">
              <Icon name="camera" size={18} /> {photoState === 'busy' ? tc('working') : t('addPhoto')}
            </button>
          </>
        )}
        {image?.info && <SourceInfo title={ts('attribution.title')} sources={[imageSource(image.info)]} tone="card" size={32} className="absolute right-3 bottom-3" testId="hero-info" />}
        <input ref={picker} type="file" accept="image/*" onChange={addPhoto} className="hidden" data-testid="photo-input" />
      </figure>
      {photoState === 'error' && <p className="mt-2 text-[13px] text-amber">{tc('error')}</p>}

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={`text-[26px] leading-tight font-bold tracking-tight ${title === row.taxon.sciName ? 'italic' : ''}`}>{title}</h1>
          {title !== row.taxon.sciName && <p className="mt-0.5 text-[15px] text-ink-soft"><i>{row.taxon.sciName}</i></p>}
        </div>
        {chip && <span className={`mt-1.5 shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold ${chip.cls}`} data-testid="chip">{chip.text}</span>}
      </div>

      <p className="mt-2 text-[15px] text-ink-soft" data-testid="meta">{meta.map((m, i) => <span key={i}>{i > 0 && ' · '}{m}</span>)}</p>
      {row.evidence === 'idAssisted' && (
        // B6: the scan line with its ⓘ: engine, the cost line (from the answer this device kept), the terms sentence.
        <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-faint" data-testid="scan-line">
          <span>{tsc('identifiedWith', { engine: scanNote?.engine ?? tsc('engine') })}</span>
          <ScanInfo size={22} note={scanNote ? tsc('costLine', { cents: format.number(scanNote.cents, { maximumFractionDigits: 1 }) }) : null} testId="sighting-scan-info" />
        </p>
      )}
      {editWhen && (
        <input type="datetime-local" value={at} max={toLocalInput(new Date())} onChange={(e) => setAt(e.target.value)} data-testid="at" autoFocus
          className="mt-2 w-full rounded-xl bg-paper px-3 py-2 text-[15px] outline-none ring-1 ring-tile focus:ring-moss" />
      )}

      <Link href={`/species/${row.taxon.gbifKey}`} data-testid="to-species" onClick={() => rememberSpeciesOrigin(origin)}
        className="mt-4 flex h-12 items-center justify-center gap-1 rounded-full bg-moss text-[17px] font-bold text-white shadow-md">
        {t('toSpecies')}
      </Link>

      <Section title={t('note')}>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder={t('notePlaceholder')} data-testid="note"
          className="w-full resize-none rounded-xl bg-paper px-3 py-2 text-[15px] outline-none ring-1 ring-tile placeholder:text-ink-faint focus:ring-moss" />
      </Section>

      <Section title={t('where')}>
        {row.lat != null && row.lng != null ? (
          <>
            <SightingMap lat={row.lat} lng={row.lng} />
            <p className="mt-2 text-[15px]" data-testid="place">{row.place ?? `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}`}</p>
          </>
        ) : (
          <p className="text-[15px] text-ink-soft" data-testid="place">{row.place ?? t('noPlace')}</p>
        )}
      </Section>

      <Section title={t('wildness')}>
        <div className="flex gap-2" role="radiogroup">
          {options.map((w) => (
            <button key={w} type="button" role="radio" aria-checked={wildness === w} onClick={() => setWildness(w)} data-testid={`wildness-${w}`}
              className={`motion-toggle flex-1 rounded-full px-4 py-2 text-[15px] font-semibold ${wildness === w ? (w === 'wild' ? 'bg-moss text-white' : 'bg-ink text-paper') : 'bg-tile text-ink-soft'}`}>
              {t(w)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-ink-faint">{t('wildnessHint')}</p>
      </Section>

      {update.isError && <p className="mt-4 text-[13px] text-amber">{tc('error')}</p>}
      {update.isSuccess && !dirty && <p className="mt-4 text-[13px] text-moss-deep" data-testid="saved">{t('saved')}</p>}

      <div className="mt-8 border-t border-tile pt-4">
        {confirm ? (
          <div data-testid="confirm">
            <p className="text-[15px]">{t('deleteConfirm')}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={remove.isPending} onClick={() => remove.mutate({ id })} data-testid="delete-yes" className="flex-1 rounded-2xl bg-ink px-4 py-3 text-[15px] font-bold text-paper disabled:opacity-60">{t('deleteYes')}</button>
              <button type="button" onClick={() => setConfirm(false)} className="flex-1 rounded-2xl bg-tile px-4 py-3 text-[15px] font-semibold">{t('deleteNo')}</button>
            </div>
            {remove.isError && <p className="mt-2 text-[13px] text-amber">{tc('error')}</p>}
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} data-testid="delete" className="text-[15px] font-semibold text-ink-soft">{t('delete')}</button>
        )}
      </div>

      {saveBar}
    </div>
  )
}

/** The diary's drawer (T1): the same detail under a handle, drag or tap outside to close, Escape too. No URL of its own; a pasted link opens the route. */
export function SightingDrawer({ id, origin, onClose }: { id: string; origin: string; onClose: () => void }) {
  const t = useTranslations('sighting')
  return (
    <Sheet onClose={onClose} labelledBy="sighting-title" testId="sighting-drawer" handleTestId="sighting-handle"
      handle={
        <div className="mt-3 flex items-center justify-between">
          <h2 id="sighting-title" className="text-[13px] font-bold tracking-wide text-ink-soft uppercase">{t('title')}</h2>
          <CloseButton testId="sighting-close" />
        </div>
      }>
      <DrawerBody id={id} origin={origin} />
    </Sheet>
  )
}

function CloseButton({ testId }: { testId: string }) {
  const tc = useTranslations('common')
  const close = useSheetClose()
  return <button type="button" onClick={close} className="text-[13px] text-ink-soft" data-testid={testId}>{tc('close')}</button>
}

function DrawerBody({ id, origin }: { id: string; origin: string }) {
  const close = useSheetClose()
  return (
    <div className="min-h-0 overflow-y-auto px-4 pt-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
      <SightingDetail id={id} mode="drawer" origin={origin} onGone={close} />
    </div>
  )
}

/** The route (`/sighting/<id>`): the detail under a back link, for deep links and the offline shell. */
export function SightingRoute({ id }: { id: string }) {
  const t = useTranslations('sighting')
  const router = useRouter()
  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-28 [&~nav]:hidden">
      <div className="mb-3 flex h-10 items-center justify-between">
        <Link href="/journal" className="flex items-center gap-1 text-[15px] font-semibold text-moss-deep"><span aria-hidden>‹</span> {t('back')}</Link>
        <span className="text-[13px] text-ink-faint">{t('title')}</span>
      </div>
      <SightingDetail id={id} mode="page" origin={`/sighting/${id}`} onGone={() => router.replace('/journal')} />
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[13px] font-semibold tracking-[0.08em] text-ink-faint uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ text, link }: { text: string; link?: string }) {
  return (
    <div className="pt-4 pb-6">
      <p className="text-[15px] text-ink-soft">{text}</p>
      {link && <Link href="/journal" className="mt-3 inline-block text-[15px] font-semibold text-moss-deep">{link}</Link>}
    </div>
  )
}
