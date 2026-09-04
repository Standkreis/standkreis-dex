import type { Species } from '../types'
import { Icon } from '../components/Marks'
import { Attribution, EmptyEcology, FactsGrid, FungusNotice, Intro, Lookalikes, MapStub, MonthStrip, Names, Section, Sources, SpeciesChip, StateRow, groupedInteractions } from '../components/Species'

// P1 · Full page, sectioned (owner's sketch 2026-09-04): image · names · intro · Steckbrief · Vorkommen · Verwechslungsgefahr · Ökologie
export default function SpeciesP1({ s }: { s: Species }) {
  const photo = s.state.userPhoto ?? s.image
  const eco = groupedInteractions(s)
  return (
    <div className="mx-auto min-h-full max-w-[520px] pb-28">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-tile">
        {photo && <img src={photo.url} alt="" className="h-full w-full object-cover" />}
        <button onClick={() => history.back()} className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-[18px] shadow">‹</button>
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-4 bg-card' : 'w-1.5 bg-white/60'}`} />)}</div>
      </div>
      <Attribution s={s} className="px-4 pt-1.5" />
      <div className="space-y-3 px-4 pt-2">
        <Names s={s} />
        <StateRow s={s} />
        <FungusNotice s={s} />
        <Intro s={s} />
      </div>
      <div className="space-y-7 px-4 pt-7">
        <Section title="Steckbrief">
          <FactsGrid s={s} />
        </Section>
        <Section title="Vorkommen" meta="Mainz-Bingen">
          <div className="space-y-2">
            <MonthStrip s={s} />
            <MapStub s={s} />
          </div>
        </Section>
        <Section title="Verwechslungsgefahr">
          <Lookalikes s={s} />
        </Section>
        <Section title="Ökologie">
          {eco.length === 0 && <EmptyEcology s={s} />}
          <div className="space-y-3">
            {eco.map((g) => (
              <div key={g.kind}>
                <h3 className="mb-1.5 text-[13px] font-semibold text-ink-soft">{g.label}</h3>
                <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">{g.targets.map((t) => <SpeciesChip key={t} id={t} />)}</div>
              </div>
            ))}
          </div>
        </Section>
        <Sources s={s} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-paper/95 px-4 pt-2 pb-5 backdrop-blur">
        <div className="mx-auto flex max-w-[520px] gap-2">
          <button className={`flex-1 rounded-2xl py-3 text-[15px] font-semibold ${s.state.studied ? 'bg-amber-soft text-amber' : 'bg-amber text-white'}`}><span className="inline-flex items-center justify-center gap-1.5"><Icon name="book" size={17} /> {s.state.studied ? 'Studiert ✓' : 'Studiert'}</span></button>
          <a href={`#/log/save/${s.id}`} className="flex-1 rounded-2xl bg-moss py-3 text-center text-[15px] font-semibold text-white">＋ Entdeckt</a>
        </div>
      </div>
    </div>
  )
}
