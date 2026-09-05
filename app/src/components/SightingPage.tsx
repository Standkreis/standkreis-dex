'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { useDayLabel } from './JournalDate'
import { Icon } from './Marks'
import { tileIcon, useName } from './SpeciesCard'
import { SightingMap } from './SightingMap'

type Wildness = 'wild' | 'captive' | 'cultivated'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A Date as the value of `<input type="datetime-local">` in local time. */
const toLocalInput = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }

/**
 * One sighting (handoff 0008 Track B): the photo or the reference image, the species link, date and time, the exact
 * place as one OSM tile with the point and the Gemeinde line, note, wildness. Note, when and wildness edit in place;
 * Löschen asks once. Deleting the only wild sighting of a taxon turns the cell grey; the counters follow through identity.progress.
 */
export function SightingPage() {
  const t = useTranslations('sighting')
  const tj = useTranslations('journal')
  const ts = useTranslations('species')
  const tc = useTranslations('common')
  const format = useFormatter()
  const name = useName()
  const { full } = useDayLabel()
  const trpc = useTRPC()
  const qc = useQueryClient()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const valid = UUID.test(id)

  const s = useQuery(trpc.journal.get.queryOptions({ id }, { enabled: valid }))
  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: trpc.journal.pathKey() }), qc.invalidateQueries({ queryKey: trpc.identity.progress.queryKey() })])
  const update = useMutation(trpc.journal.update.mutationOptions({ onSuccess: () => invalidate() }))
  const remove = useMutation(trpc.journal.remove.mutationOptions({ onSuccess: async () => { await invalidate(); router.replace('/journal') } }))

  // The three editable fields are overrides on top of the row; nothing is copied into state, so a refetch needs no effect.
  const [edit, setEdit] = useState<{ note?: string; at?: string; wildness?: Wildness }>({})
  const [confirm, setConfirm] = useState(false)
  const row = s.data

  if (!valid || (s.isSuccess && !row)) return <Empty text={t('notFound')} link={t('toJournal')} />
  if (!row) return <Empty text={tc('working')} />

  const note = edit.note ?? row.note ?? '', at = edit.at ?? toLocalInput(row.at), wildness = edit.wildness ?? row.wildness
  const setNote = (v: string) => setEdit((e) => ({ ...e, note: v })), setAt = (v: string) => setEdit((e) => ({ ...e, at: v })), setWildness = (v: Wildness) => setEdit((e) => ({ ...e, wildness: v }))
  const dirty = note.trim() !== (row.note ?? '') || at !== toLocalInput(row.at) || wildness !== row.wildness
  const save = () => update.mutate({ id, note: note.trim() || null, at: new Date(at), wildness }, { onSuccess: () => setEdit({}) })
  const reset = () => setEdit({})
  const image = row.photo ?? row.reference
  const origin = (o: string) => (o === 'inat' || o === 'commons' || o === 'user' ? ts(`origin.${o}`) : ts('origin.other'))
  const title = name(row.taxon)
  const chip = row.first ? { text: tj('newlySeen'), cls: 'bg-moss-soft text-moss-deep' } : row.wildness !== 'wild' ? { text: tj(row.wildness), cls: 'bg-tile text-ink-soft' } : null
  const options: Wildness[] = row.wildness === 'cultivated' ? ['wild', 'captive', 'cultivated'] : ['wild', 'captive']

  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-28 [&~nav]:hidden" data-testid="sighting">
      <div className="flex h-10 items-center justify-between">
        <Link href="/journal" className="flex items-center gap-1 text-[15px] font-semibold text-moss-deep"><span aria-hidden>‹</span> {t('back')}</Link>
        <span className="text-[13px] text-ink-faint">{t('title')}</span>
      </div>

      <figure className="mt-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-tile">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser
            <img src={image.url} alt="" className={`h-full w-full object-cover ${row.photo || row.wildness === 'wild' ? '' : 'grayscale'}`} data-testid="image" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[64px] text-ink-faint">{tileIcon[row.taxon.tile] ?? '?'}</span>
          )}
        </div>
        {image && (
          <figcaption className="mt-1.5 text-[13px] text-ink-faint" data-testid="caption">
            {image.origin === 'user' ? ts('origin.user') : t('photoCaption', { author: image.author, licence: image.licence, origin: origin(image.origin) })}
            {!row.photo && <> · {t('reference')}</>}
          </figcaption>
        )}
      </figure>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={`text-[28px] leading-tight font-bold tracking-tight ${title === row.taxon.sciName ? 'italic' : ''}`}>{title}</h1>
          {title !== row.taxon.sciName && <p className="mt-0.5 text-[15px] text-ink-soft"><i>{row.taxon.sciName}</i></p>}
        </div>
        {chip && <span className={`mt-2 shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold ${chip.cls}`} data-testid="chip">{chip.text}</span>}
      </div>
      <Link href={`/species/${row.taxon.gbifKey}`} className="mt-1 inline-block text-[15px] font-semibold text-moss-deep" data-testid="to-species">{t('toSpecies')}</Link>

      <Section title={t('when')}>
        <p className="text-[17px] font-semibold" data-testid="when">{t('dateTime', { day: full(row.at), time: format.dateTime(row.at, { hour: '2-digit', minute: '2-digit' }) })}</p>
        <input type="datetime-local" value={at} max={toLocalInput(new Date())} onChange={(e) => setAt(e.target.value)} data-testid="at"
          className="mt-2 w-full rounded-xl bg-paper px-3 py-2 text-[15px] outline-none ring-1 ring-tile focus:ring-moss" />
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

      <Section title={t('note')}>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder={t('notePlaceholder')} data-testid="note"
          className="w-full resize-none rounded-xl bg-paper px-3 py-2 text-[15px] outline-none ring-1 ring-tile placeholder:text-ink-faint focus:ring-moss" />
      </Section>

      <Section title={t('wildness')}>
        <div className="flex gap-2" role="radiogroup">
          {options.map((w) => (
            <button key={w} type="button" role="radio" aria-checked={wildness === w} onClick={() => setWildness(w)} data-testid={`wildness-${w}`}
              className={`flex-1 rounded-full px-4 py-2 text-[15px] font-semibold ${wildness === w ? (w === 'wild' ? 'bg-moss text-white' : 'bg-ink text-paper') : 'bg-tile text-ink-soft'}`}>
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

      {dirty && (
        <div className="fixed inset-x-0 z-10" style={{ bottom: 'env(safe-area-inset-bottom)' }}>
          <div className="mx-auto flex max-w-[520px] gap-2 bg-gradient-to-t from-paper via-paper/95 to-paper/0 px-4 pt-6 pb-2">
            <button type="button" onClick={reset} className="rounded-full bg-tile px-5 text-[15px] font-semibold text-ink-soft">{t('discard')}</button>
            <button type="button" disabled={update.isPending || !at} onClick={save} data-testid="save" className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-moss text-[17px] font-bold text-white shadow-md disabled:opacity-60">
              <Icon name="journal" size={20} /> {t('save')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[13px] font-semibold tracking-[0.08em] text-ink-faint uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ text, link }: { text: string; link?: string }) {
  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-6 pb-24">
      <p className="text-[15px] text-ink-soft">{text}</p>
      {link && <Link href="/journal" className="mt-3 inline-block text-[15px] font-semibold text-moss-deep">{link}</Link>}
    </main>
  )
}
