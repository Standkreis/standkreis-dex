'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { TRPCClientError } from '@trpc/client'
import { useTranslations } from 'next-intl'
import { useTRPC } from '@/trpc/client'
import { queuedPhoto } from './LogPhoto'
import { useOutbox } from './Queue'
import { enqueueScan, confidenceWord, rememberScan, scanOf, scanRowFor, type ScanRegion, type ScanResult } from './Scan'
import { Sheet, useSheetClose } from './Sheet'

export type ScanState = { status: 'busy' | 'offline' | 'error' | 'done'; result: ScanResult | null; code: string | null }

/**
 * The scan behind `/log?photo=<id>&scan=1` (handoff 0016 B3–B5). One `identify` per photo: the answer is kept in
 * localStorage by photo id, so back and reload show the ladder again for free. A photo that is an outbox row (taken
 * without signal), or a call that gets no answer at all, becomes a `scan` row of the outbox: "kein Netz · wird beim
 * nächsten Mal bestimmt", the flush identifies later (Queue.ts). A typed error from the server (415, 429, 408 …) is shown as such.
 */
export function useScan(photoId: string | null, region: ScanRegion | null, enabled: boolean): ScanState | null {
  const trpc = useTRPC()
  const identify = useMutation(trpc.sighting.identify.mutationOptions())
  const outbox = useOutbox() // re-renders when a scan row appears or gets its ladder
  const [asked, setAsked] = useState<(ScanState & { id: string }) | null>(null)
  const started = useRef<string | null>(null)
  // Derived, not set: what is known about this photo right now.
  const known = enabled ? scanOf(photoId) : null
  const row = enabled ? scanRowFor(photoId) : null
  useEffect(() => {
    if (!enabled || !photoId || !region || known || row || started.current === photoId) return
    started.current = photoId
    if (queuedPhoto(photoId)) { void enqueueScan({ photoRow: photoId, region }); return } // the row shows up through the outbox → "offline"
    identify.mutateAsync({ photoId, regionId: region.id }).then(
      (r) => { rememberScan(photoId, r); setAsked({ id: photoId, status: 'done', result: r, code: null }) },
      (e: unknown) => {
        const data = e instanceof TRPCClientError ? (e.data as { httpStatus?: number; code?: string } | undefined) : undefined
        if (data?.httpStatus === undefined) void enqueueScan(queuedPhoto(photoId) ? { photoRow: photoId, region } : { photoId, region }) // no answer at all: the signal went; the row shows up as "offline"
        else setAsked({ id: photoId, status: 'error', result: null, code: data.code ?? null })
      },
    )
  }, [enabled, photoId, region, known, row, identify, outbox])
  if (!enabled || !photoId) return null
  if (known) return { status: 'done', result: known, code: null }
  if (row) return row.dead ? { status: 'error', result: null, code: row.lastError?.includes('415') ? 'UNSUPPORTED_MEDIA_TYPE' : null } : { status: 'offline', result: null, code: null }
  if (asked?.id === photoId) return asked
  return region ? { status: 'busy', result: null, code: null } : null
}

const RUNGS = ['family', 'genus', 'species'] as const
const STEP_MS = 220

/**
 * The ladder sheet (B3, B4): the photo small at the top, the rungs family → genus → species rising 220 ms apart
 * (`motion-rung`, zero under reduced motion), the evidence under the deepest rung, the confidence as a word. `several`
 * asks which one; `none` / `outside` says "Nicht im Atlas von {region}: vermutlich …". Buttons: "Das ist es" when there is
 * an answer with a key, "Nein, suchen" always (prefilled with the genus or the outside name), "Noch ein Foto" with the
 * close-up hint (record I2) whenever the answer stopped short of the species. Offline: the one sentence and "Zum Tagebuch".
 */
export function LadderSheet({ state, photoUrl, region, commonName, onTake, onSearch, onAgain, onJournal, onClose }: {
  state: ScanState
  photoUrl: string | null
  region: string | null
  /** The saved name of the answer in the reader's language, when the caller has the set. */
  commonName?: string | null
  onTake: (gbifKey: number) => void
  onSearch: (q: string) => void
  onAgain?: () => void
  onJournal?: () => void
  onClose: () => void
}) {
  const t = useTranslations('scan')
  return (
    <Sheet onClose={onClose} labelledBy="ladder-title" z="z-40" testId="ladder-sheet" handleTestId="ladder-handle"
      handle={
        <div className="mt-3 flex items-center justify-between">
          <h2 id="ladder-title" className="text-[13px] font-bold tracking-wide text-ink-soft uppercase">{t('title')}</h2>
          <CloseButton />
        </div>
      }>
      <div className="min-h-0 overflow-y-auto px-4 pt-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }} data-testid="ladder-body" data-state={state.status}>
        <div className="flex items-start gap-4">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- the identity's own upload, or its local blob
            <img src={photoUrl} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover" data-testid="ladder-photo" />
          )}
          <div className="min-w-0 flex-1">
            <Body state={state} region={region} commonName={commonName} onTake={onTake} onSearch={onSearch} onAgain={onAgain} onJournal={onJournal} />
          </div>
        </div>
      </div>
    </Sheet>
  )
}

function Body({ state, region, commonName, onTake, onSearch, onAgain, onJournal }: { state: ScanState; region: string | null; commonName?: string | null; onTake: (k: number) => void; onSearch: (q: string) => void; onAgain?: () => void; onJournal?: () => void }) {
  const t = useTranslations('scan')
  const close = useSheetClose()
  const primary = 'flex h-13 flex-1 items-center justify-center rounded-full bg-moss px-5 text-[17px] font-bold text-white shadow-md'
  const secondary = 'flex h-13 flex-1 items-center justify-center rounded-full bg-card px-5 text-[17px] font-semibold text-ink shadow-[0_2px_12px_rgba(30,42,35,0.06)]'
  const quiet = 'mt-3 text-[15px] font-semibold text-moss-deep'
  const searchButton = (q: string, cls = secondary) => <button type="button" onClick={() => onSearch(q)} className={cls} data-testid="ladder-search">{t('search')}</button>
  const again = onAgain && <button type="button" onClick={onAgain} className={quiet} data-testid="ladder-again">{t('again')}</button>

  if (state.status === 'busy') return <p className="animate-pulse pt-2 text-[17px] font-semibold" data-testid="ladder-sentence">{t('busy')}</p>
  if (state.status === 'offline') {
    return (
      <>
        <p className="pt-1 text-[17px] leading-snug font-semibold" data-testid="ladder-sentence">{t('offline')}</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-soft">{t('offlineSub')}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onJournal ?? close} className={primary} data-testid="ladder-journal">{t('toJournal')}</button>
        </div>
      </>
    )
  }
  if (state.status === 'error' || !state.result) {
    const code = state.code
    const line = code === 'UNSUPPORTED_MEDIA_TYPE' ? t('errorImage') : code === 'TOO_MANY_REQUESTS' ? t('errorBusy') : code === 'TIMEOUT' ? t('errorTimeout') : t('error')
    return (
      <>
        <p className="pt-1 text-[17px] leading-snug font-semibold text-amber" data-testid="ladder-sentence">{line}</p>
        <div className="mt-4 flex gap-2">{searchButton('', primary)}</div>
        {again}
      </>
    )
  }
  const r = state.result
  if (r.subject === 'several') {
    return (
      <>
        <p className="pt-1 text-[17px] leading-snug font-semibold" data-testid="ladder-sentence">{t('several')}</p>
        <Evidence lines={r.evidence} />
        <div className="mt-4 flex gap-2">{searchButton('', primary)}</div>
        {again}
      </>
    )
  }
  if (r.subject === 'none' || r.outside) {
    const outside = r.outside
    return (
      <>
        <p className="pt-1 text-[17px] leading-snug font-semibold" data-testid="ladder-sentence">{outside ? t('outside', { region: region ?? '…', outside }) : t('none')}</p>
        <Evidence lines={r.evidence} />
        <div className="mt-4 flex gap-2">
          {r.answer && <button type="button" onClick={() => onTake(r.answer!.gbifKey)} className={primary} data-testid="ladder-take">{t('take')}</button>}
          {searchButton(outside ?? '', r.answer ? secondary : primary)}
        </div>
        {again}
      </>
    )
  }
  // single: the ladder
  const rungs = RUNGS.map((k) => ({ k, v: r.ladder[k] })).filter((x): x is { k: (typeof RUNGS)[number]; v: string } => !!x.v)
  const deepest = rungs[rungs.length - 1]?.k
  const word = confidenceWord(r.confidence)
  const title = r.answer ? (commonName ?? r.answer.sciName) : r.ladder.genus ? t('genusOnly', { genus: r.ladder.genus }) : t('unknownTitle')
  return (
    <>
      <p className="pt-1 text-[22px] leading-tight font-bold" data-testid="ladder-name">{title}</p>
      <p className="mt-0.5 text-[15px] text-ink-soft" data-testid="ladder-confidence" data-word={word}>{r.answer && commonName && commonName !== r.answer.sciName ? <><i>{r.answer.sciName}</i> · </> : null}{t(word)}</p>
      {rungs.length > 0 ? (
        <ol className="mt-3" data-testid="ladder-rungs">
          {rungs.map((x, i) => (
            <li key={x.k} className="motion-rung border-l-2 border-moss/40 py-1.5 pl-3" style={{ animationDelay: `${i * STEP_MS}ms` }} data-testid={`rung-${x.k}`}>
              <span className="block text-[12px] font-semibold tracking-wide text-ink-faint uppercase">{t(`rung.${x.k}`)}</span>
              <span className={`block text-[17px] leading-tight ${x.k === 'family' ? '' : 'italic'} ${x.k === deepest ? 'font-bold' : ''}`}>{x.v}</span>
              {x.k === deepest && <Evidence lines={r.evidence} inside />}
            </li>
          ))}
        </ol>
      ) : (
        <Evidence lines={r.evidence} />
      )}
      {!r.answer && (
        <div className="mt-3 rounded-2xl bg-amber-soft px-3 py-2.5 text-[14px] leading-snug text-amber" data-testid="ladder-hint">
          {t('hint')}
          {r.hint && <span className="mt-1 block text-[13px] text-amber/80">{r.hint}</span>}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {r.answer && <button type="button" onClick={() => onTake(r.answer!.gbifKey)} className={primary} data-testid="ladder-take">{t('take')}</button>}
        {searchButton(r.ladder.genus ?? r.ladder.family ?? '', r.answer ? secondary : primary)}
      </div>
      {!r.answer && again}
    </>
  )
}

function Evidence({ lines, inside = false }: { lines: string[]; inside?: boolean }) {
  if (!lines.length) return null
  return (
    <ul className={`${inside ? 'mt-1' : 'mt-2'} text-[13px] leading-snug text-ink-soft`} data-testid="ladder-evidence">
      {lines.map((l, i) => <li key={i} className="flex gap-1.5"><span aria-hidden>·</span><span>{l}</span></li>)}
    </ul>
  )
}

function CloseButton(): ReactNode {
  const tc = useTranslations('common')
  const close = useSheetClose()
  return <button type="button" onClick={close} className="text-[13px] text-ink-soft" data-testid="ladder-close">{tc('close')}</button>
}
