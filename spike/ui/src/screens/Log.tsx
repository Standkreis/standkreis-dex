import { species, byId } from '../data'
import { MONTH, type Species } from '../types'
import { MiniTile, groupOf } from '../components/Species'
import GridA from './GridA'

// Screen 4 · Log a sighting. Settled in the fill round: the centred CTA opens a chooser (camera · gallery · search),
// the ID engine later prefills the search, both paths end on one save step whose button *is* the wild/captive answer.
// Three taps outdoors: CTA → species → "Wild · speichern".

/** 4a · The chooser that the centred "＋" opens over the grid. */
export function LogChooser() {
  return (
    <div className="relative min-h-full">
      <GridA hideBar />
      <div className="fixed inset-0 z-30 bg-ink/40" />
      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-paper px-4 pt-3 pb-8">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <p className="px-1 text-[13px] font-semibold text-ink-soft uppercase">Eintragen</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            ['📷', 'Foto', 'aufnehmen'],
            ['🖼️', 'Galerie', 'auswählen'],
            ['🔍', 'Suchen', 'ohne Foto'],
          ].map(([g, t, sub]) => (
            <a key={t} href={t === 'Suchen' ? '#/log/search' : '#/log/search?photo'} className={`flex flex-col items-center rounded-2xl py-4 ${t === 'Suchen' ? 'bg-moss text-white' : 'bg-card shadow-sm'}`}>
              <span className="text-[28px]">{g}</span>
              <span className="mt-1 text-[15px] font-semibold">{t}</span>
              <span className={`text-[12px] ${t === 'Suchen' ? 'text-white/75' : 'text-ink-faint'}`}>{sub}</span>
            </a>
          ))}
        </div>
        <p className="mt-3 px-1 text-[12px] text-ink-faint">Ein Foto wird gespeichert, nicht bestimmt. Die automatische Bestimmung kommt später.</p>
      </div>
    </div>
  )
}

const Row = ({ s, meta }: { s: Species; meta?: string }) => (
  <a href={`#/log/save/${s.id}${location.hash.includes('photo') ? '?photo' : ''}`} className="flex items-center gap-3 px-4 py-2.5 active:bg-tile">
    <MiniTile s={s} size={44} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[15px] font-semibold">{s.names.de}</p>
      <p className="truncate text-[12px] text-ink-soft"><i>{s.names.sci}</i> · {groupOf(s).one}{meta ? ` · ${meta}` : ''}</p>
    </div>
    {s.state.seen && <span className="text-[11px] text-moss-deep">entdeckt</span>}
  </a>
)

/** 4b · Search. Empty query: "likely now" shortlist so most walks need no typing. With a query: dex first, backbone below. */
export function LogSearch({ q = '' }: { q?: string }) {
  const norm = (x: string) => x.toLowerCase()
  // word-start match: "ei" finds Eichelhäher and Eichhörnchen, not Kohlmeise
  const hits = q ? species.filter((s) => [s.names.de, s.names.sci, s.names.en].some((n) => norm(n).split(/[\s-]/).some((w) => w.startsWith(norm(q))))) : []
  const likely = species.filter((s) => s.months[MONTH] >= 3 && !s.state.seen).slice(0, 8)
  return (
    <div className="mx-auto min-h-full max-w-[520px] pb-8">
      <header className="sticky top-0 z-10 bg-paper px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <button className="h-10 w-10 rounded-full bg-card shadow-sm" onClick={() => history.back()}>‹</button>
          <div className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-card px-4 shadow-sm">
            <span className="text-ink-faint">🔍</span>
            <span className={`flex-1 text-[16px] ${q ? '' : 'text-ink-faint'}`}>{q || 'Art suchen · deutsch oder lateinisch'}</span>
            {q && <span className="text-ink-faint">✕</span>}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-ink/20 px-3 py-2 text-[12px] text-ink-faint">
          {location.hash.includes('photo') ? <><span>📷</span> 1 Foto angehängt · wird zur Art gespeichert</> : <><span>📷</span> Kein Foto angehängt · <span className="underline">hinzufügen</span></>}
        </div>
      </header>
      {!q ? (
        <>
          <p className="px-4 pt-2 pb-1 text-[12px] font-semibold text-ink-soft uppercase">Jetzt wahrscheinlich · noch nicht entdeckt</p>
          {likely.map((s) => <Row key={s.id} s={s} meta="September" />)}
          <p className="px-4 pt-4 text-[12px] text-ink-faint">Nicht dabei? Tippe oben. Gesucht wird das ganze GBIF-Backbone, nicht nur dein Dex.</p>
        </>
      ) : (
        <>
          <p className="px-4 pt-2 pb-1 text-[12px] font-semibold text-ink-soft uppercase">In deinem Dex</p>
          {hits.map((s) => <Row key={s.id} s={s} />)}
          <p className="px-4 pt-4 pb-1 text-[12px] font-semibold text-ink-soft uppercase">Außerhalb deines Dex · GBIF-Backbone</p>
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="h-11 w-11 rounded-xl bg-tile" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Eichenprozessionsspinner</p>
              <p className="text-[12px] text-ink-soft"><i>Thaumetopoea processionea</i> · Insekt · wird in deinen Dex aufgenommen</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** 4c · Save. One screen, everything visible, the button is the wild/captive answer. */
export function LogSave({ s, photo = false }: { s: Species; photo?: boolean }) {
  const img = photo ? (s.state.userPhoto ?? s.image) : null
  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col px-4 pt-3 pb-8">
      <div className="flex items-center gap-2">
        <button className="h-10 w-10 rounded-full bg-card shadow-sm" onClick={() => history.back()}>‹</button>
        <p className="text-[15px] font-semibold">Sichtung speichern</p>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
        <MiniTile s={s} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-[18px] leading-tight font-bold">{s.names.de}</p>
          <p className="text-[13px] text-ink-soft"><i>{s.names.sci}</i> · {groupOf(s).one}</p>
        </div>
        <a href="#/log/search?q=ei" className="text-[13px] text-moss-deep">ändern</a>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
        <div className="rounded-2xl bg-card p-3 shadow-sm"><p className="text-ink-faint">Wann</p><p className="font-semibold">Heute, 4. Sep · 17:42</p></div>
        <div className="rounded-2xl bg-card p-3 shadow-sm"><p className="text-ink-faint">Wo</p><p className="font-semibold">Mainz-Bingen</p><p className="text-[11px] text-ink-faint">genau gespeichert · geteilt nur grob</p></div>
      </div>
      <div className="mt-3 rounded-2xl bg-card p-3 shadow-sm">
        {img ? (
          <div className="flex items-center gap-3"><img src={img.url} alt="" className="h-16 w-16 rounded-xl object-cover" /><div className="flex-1 text-[13px]"><p className="font-semibold">1 Foto</p><p className="text-ink-faint">wird zum Bild der Art in deinem Dex</p></div><span className="text-[13px] text-moss-deep">＋</span></div>
        ) : (
          <div className="flex items-center gap-3 text-[13px]"><span className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-ink/20 text-[22px]">📷</span><div className="flex-1"><p className="font-semibold">Kein Foto</p><p className="text-ink-faint">optional, auch später möglich</p></div><span className="text-moss-deep">hinzufügen</span></div>
        )}
      </div>
      <div className="mt-3 rounded-2xl bg-card px-3 py-2.5 text-[13px] text-ink-faint shadow-sm">Notiz · optional</div>
      <div className="flex-1" />
      <p className="mb-2 text-center text-[13px] text-ink-soft">War es wild?</p>
      <div className="grid grid-cols-2 gap-3">
        <a href={`#/fill/sheet/${s.id}`} className="rounded-2xl bg-moss py-4 text-center text-white shadow-sm"><span className="block text-[17px] font-bold">🌳 Wild</span><span className="text-[12px] text-white/80">speichern</span></a>
        <a href={`#/fill/sheet/${s.id}`} className="rounded-2xl bg-card py-4 text-center shadow-sm"><span className="block text-[17px] font-bold">🏠 Gehalten</span><span className="text-[12px] text-ink-faint">Zoo, Garten, Topf · speichern</span></a>
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-faint">Gehaltene Tiere und gepflanzte Pflanzen zählen für deinen Dex, aber nicht als Entdeckung in der Natur.</p>
    </div>
  )
}

export const logSpecies = (id: string) => byId.get(id)
