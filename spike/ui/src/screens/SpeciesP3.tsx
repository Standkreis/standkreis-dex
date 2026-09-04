import { byId } from '../data'
import type { Species } from '../types'
import { Icon } from '../components/Marks'
import { Attribution, EmptyEcology, FungusNotice, Intro, MapStub, MiniTile, MonthStrip, Names, Sources, StateRow, Tags, KIND_DE, KIND_ORDER } from '../components/Species'

// P3 · Full page · square image beside the names · actions inline · ecology as sentences, one per line
export default function SpeciesP3({ s }: { s: Species }) {
  const photo = s.state.userPhoto ?? s.image
  const rows = [...s.interactions].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
  return (
    <div className="mx-auto min-h-full max-w-[520px] pb-10">
      <div className="flex items-center justify-between px-4 pt-3"><button className="text-[22px]">‹</button><span className="text-[13px] text-ink-soft">Art</span><button className="text-[15px]">↗</button></div>
      <div className="flex gap-3 px-4 pt-3">
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-tile">{photo && <img src={photo.url} alt="" className="h-full w-full object-cover" />}</div>
        <div className="min-w-0 flex-1 space-y-2"><Names s={s} size="md" /><Tags s={s} /></div>
      </div>
      <Attribution s={s} className="px-4 pt-1.5" />
      <div className="space-y-3 px-4 pt-3">
        <div className="flex gap-2">
          <button className={`flex-1 rounded-xl py-2.5 text-[14px] font-semibold ${s.state.studied ? 'bg-amber-soft text-amber' : 'border border-amber text-amber'}`}><span className="inline-flex items-center justify-center gap-1.5"><Icon name="book" size={16} /> {s.state.studied ? 'Studiert ✓' : 'Als studiert markieren'}</span></button>
          <button className="flex-1 rounded-xl bg-moss py-2.5 text-[14px] font-semibold text-white">＋ Entdeckt!</button>
        </div>
        <StateRow s={s} />
        <FungusNotice s={s} />
        <Intro s={s} />
        <div className="grid grid-cols-2 gap-3">
          <div><h3 className="mb-1.5 text-[12px] font-semibold text-ink-soft uppercase">Im Jahr</h3><MonthStrip s={s} /></div>
          <div><h3 className="mb-1.5 text-[12px] font-semibold text-ink-soft uppercase">Wo</h3><MapStub s={s} /></div>
        </div>
        <section>
          <h2 className="mb-2 text-[17px] font-bold">Ökologie</h2>
          {rows.length === 0 && <EmptyEcology s={s} />}
          <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl bg-card ring-1 ring-ink/5">
            {rows.map((e) => { const t = byId.get(e.target)!; return (
              <li key={e.kind + e.target} className="flex items-center gap-3 px-3 py-2">
                <MiniTile s={t} size={36} />
                <span className="min-w-0 flex-1 text-[14px] leading-tight"><span className="text-ink-soft">{s.names.de} {KIND_DE[e.kind]}</span> <span className="font-semibold">{t.names.de}</span></span>
                <span className="text-ink-faint">›</span>
              </li>
            ) })}
          </ul>
        </section>
        <Sources s={s} />
      </div>
    </div>
  )
}
