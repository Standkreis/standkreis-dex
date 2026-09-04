import type { Species } from '../types'
import GridA from './GridA'
import { Attribution } from '../components/Species'

// Screen 5 · the fill moment. Static frames of a motion: the mock shows the mid-state.
// Haptic note for the Capacitor wrap: one medium impact when the photo lands, nothing else.

/** F1 · In place on the grid: the tapped cell scales up, the photo irises open over the silhouette, the counter ticks. */
export function FillGrid({ s }: { s: Species }) {
  return (
    <div className="relative">
      <GridA fill={s.id} />
      <div className="fixed inset-x-4 bottom-24 z-30 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-paper shadow-lg">
        <span className="text-[20px]">👁</span>
        <a href={`#/species/p1/${s.id}`} className="min-w-0 flex-1"><p className="text-[15px] font-semibold">{s.names.de} entdeckt ›</p><p className="text-[12px] text-white/70">4. Sep · Mainz-Bingen · Ort grob gespeichert</p></a>
        <button className="rounded-full bg-paper/15 px-3 py-1.5 text-[13px] font-medium">Foto</button>
      </div>
    </div>
  )
}

/** F2 · Full-screen card: the grey image turns to colour, then the card returns to the grid. */
export function FillCard({ s }: { s: Species }) {
  const photo = s.state.userPhoto ?? s.image
  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none opacity-40 blur-[2px]"><GridA hideBar /></div>
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-ink/60 px-6">
        <p className="mb-3 text-[13px] font-semibold tracking-wide text-white/80 uppercase">Zum ersten Mal entdeckt</p>
        <div className="w-full overflow-hidden rounded-3xl bg-paper shadow-2xl">
          <div className="relative aspect-square w-full bg-tile">
            {photo && <img src={photo.url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="px-5 pt-4 pb-5">
            <h1 className="text-[26px] leading-tight font-bold">{s.names.de}</h1>
            <p className="text-[13px] text-ink-soft"><i>{s.names.sci}</i></p>
            <p className="mt-2 text-[14px] text-moss-deep">👁 4. Sep · Mainz-Bingen <span className="text-ink-faint">· Ort grob gespeichert</span></p>
            <Attribution s={s} className="mt-1" />
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-2xl bg-tile py-3 text-[15px] font-semibold text-ink">📷 Foto hinzufügen</button>
              <button className="flex-1 rounded-2xl bg-moss py-3 text-[15px] font-semibold text-white">Weiter</button>
            </div>
          </div>
        </div>
        <p className="mt-4 text-[13px] text-white/70">9 entdeckt · 12 studiert</p>
      </div>
    </div>
  )
}

/** F3 · Compact sheet (chosen, revised 2026-09-04): the cell fills on the grid behind; the sheet names what was saved,
 *  labels a reference-image fill honestly, and leads to the species page. No acknowledge button: dismiss by swiping down
 *  or tapping the grid. "Foto" only appears when no photo is attached (flow A, claim without proof). */
export function FillSheet({ s }: { s: Species }) {
  const own = s.state.userPhoto
  const photo = own ?? s.image
  const href = `#/species/p1/${s.id}`
  return (
    <div className="relative min-h-full">
      <GridA fill={s.id} hideBar />
      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl bg-paper px-4 pt-3 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <a href={href} className="flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-tile ring-2 ring-moss">{photo && <img src={photo.url} alt="" className="h-full w-full object-cover" />}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-moss-deep uppercase">Entdeckt</p>
            <h2 className="text-[20px] leading-tight font-bold">{s.names.de}</h2>
            <p className="text-[12px] text-ink-soft">👁 4. Sep · Mainz-Bingen · Ort grob gespeichert</p>
          </div>
          <span className="text-[22px] text-ink-faint">›</span>
        </a>
        {!own && photo && (
          <p className="mt-2 text-[11px] leading-snug text-ink-faint">
            Referenzbild: {photo.author} · {photo.license} · <a href={photo.page} className="underline">Wikimedia Commons</a>. Dein eigenes Foto ersetzt es.
          </p>
        )}
        <div className="mt-4 flex gap-2">
          {!own && <button className="flex-1 rounded-2xl bg-tile py-3 text-[15px] font-semibold">📷 Foto</button>}
          <a href={href} className="flex-1 rounded-2xl bg-moss py-3 text-center text-[15px] font-semibold text-white">Zur Art ›</a>
        </div>
      </div>
    </div>
  )
}
