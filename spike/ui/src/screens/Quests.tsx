import { byId } from '../data'
import type { Species } from '../types'
import { MiniTile } from '../components/Species'
import { BottomBar, Screen } from '../components/Shell'

// Screen 7 · Quests (slice two, mocked 2026-09-04). Record Q8: three weekly quests generated from the user's own state
// (plausible-by-month, interaction graph, history). No streak, no rarity, no coordinates. Weekly, no freeze (owner). XP for a done quest show on Du only.
// Every quest shows its "why": the generation reason, so nothing reads as an authored catalogue.

type Kind = 'graph' | 'bridge' | 'season'
type Quest = { id: string; kind: Kind; title: string; why: string; do: 'find' | 'study'; targets: string[]; context?: string; any?: boolean }

const KIND: Record<Kind, { label: string; emoji: string }> = {
  graph: { label: 'Ökologie', emoji: '🔗' },
  bridge: { label: 'Ausblick', emoji: '🔭' },
  season: { label: 'Saison', emoji: '🍂' },
}

const QUESTS: Quest[] = [
  { id: 'comma', kind: 'graph', do: 'find', title: 'C-Falter an der Brombeere', targets: ['polygonia-c-album'], context: 'rubus-fruticosus',
    why: 'Deine Brombeere trägt jetzt Früchte, und GloBI sagt: der C-Falter kommt zum Saft. Du hast ihn noch nie entdeckt.' },
  { id: 'autumn-three', kind: 'bridge', do: 'study', title: 'Drei Herbstankömmlinge studieren', targets: ['garrulus-glandarius', 'quercus-robur', 'boletus-edulis'],
    why: 'Eichelhäher, Stieleiche und Steinpilz haben ab Oktober Hauptzeit, und der Häher sammelt die Eicheln. Was du diese Woche studierst, suchst du nächste Woche.' },
  { id: 'fungus', kind: 'season', do: 'find', title: 'Ein Pilz im Buchenwald', targets: ['amanita-muscaria', 'boletus-edulis', 'fomes-fomentarius'], any: true,
    why: 'Nach dem Regen stehen jetzt Pilze im Laubwald. Einer von dreien reicht. Nur anschauen, kein Speisepilz-Ratgeber.' },
]

const LAST_WEEK = [
  { title: 'Amsel im Garten', done: true },
  { title: 'Zwei Tagfalter studieren', done: true },
  { title: 'Rotmilan über dem Feld', done: false },
]

const isDone = (q: Quest, s: Species) => (q.do === 'find' ? s.state.seen : s.state.studied)
const progress = (q: Quest) => {
  const done = q.targets.map(byId.get.bind(byId) as (id: string) => Species).filter((s) => isDone(q, s))
  return { done: done.length, need: q.any ? 1 : q.targets.length, complete: q.any ? done.length >= 1 : done.length === q.targets.length, first: done[0] }
}

function Ticks({ done, need }: { done: number; need: number }) {
  return <span className="flex gap-1">{Array.from({ length: need }, (_, i) => <span key={i} className={`h-2 w-4 rounded-full ${i < done ? 'bg-moss' : 'bg-tile'}`} />)}</span>
}

function QuestCard({ q }: { q: Quest }) {
  const p = progress(q)
  const k = KIND[q.kind]
  return (
    <article className={`rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-ink/5 ${p.complete ? 'ring-moss/40' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-tile px-2 py-0.5 text-[11px] text-ink-soft">{k.emoji} {k.label}</span>
        {p.complete ? <span className="text-[12px] font-semibold text-moss-deep">✓ Erledigt</span> : <Ticks done={p.done} need={p.need} />}
      </div>
      <h2 className="mt-2 text-[17px] leading-tight font-bold">{q.title}</h2>
      <p className="mt-1 text-[13px] leading-snug text-ink-soft">{q.why}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {q.context && <><MiniTile s={byId.get(q.context)!} size={36} /><span className="text-[13px] text-ink-faint">→</span></>}
        {q.targets.map((id) => {
          const s = byId.get(id)!
          const ok = isDone(q, s)
          return (
            <a key={id} href={`#/species/p1/${id}`} className={`flex items-center gap-1.5 rounded-xl py-1 pr-2.5 pl-1 ${ok ? 'bg-moss-soft' : 'bg-tile'}`}>
              <MiniTile s={s} size={36} />
              <span className="text-[12px] leading-tight font-medium">{s.names.de}{ok && <span className="block text-[10px] font-normal text-moss-deep">{q.do === 'find' ? `entdeckt · ${Number(s.state.seenFirst!.slice(8))}. Sep` : 'studiert'}</span>}</span>
            </a>
          )
        })}
      </div>
      {!p.complete && (
        <a href={`#/species/p1/${q.targets.find((id) => !isDone(q, byId.get(id)!))}`} className="mt-3 block w-full rounded-xl bg-tile py-2 text-center text-[13px] font-semibold text-ink">
          {q.do === 'find' ? 'Zur Art · wo suchen ›' : 'Jetzt studieren ›'}
        </a>
      )}
    </article>
  )
}

export function Quests() {
  const walk = location.hash.includes('v=walk')
  return (
    <Screen>
      <header className="px-4 pt-3 pb-3">
        <div className="flex h-10 items-center justify-between">
          <h1 className="text-[28px] leading-none font-bold tracking-tight">Quests</h1>
        </div>
        <p className="mt-2 text-[13px] text-ink-faint">Woche 36 · Mo 31. Aug – So 6. Sep · 📍 Mainz-Bingen</p>
      </header>
      <div className="space-y-3 px-4">
        {walk ? <WalkPlan /> : QUESTS.map((q) => <QuestCard key={q.id} q={q} />)}
        <p className="pt-1 text-[12px] leading-snug text-ink-faint">Quests werden montags aus deinem Dex erzeugt: was jetzt draußen ist, was womit zusammenhängt, was du studiert und entdeckt hast. Keine Rangliste, keine Serie, kein Ort.</p>
        <section className="pt-3">
          <h2 className="mb-2 text-[15px] font-bold text-ink-soft">Letzte Woche</h2>
          <ul className="divide-y divide-ink/5 rounded-2xl bg-card px-3 shadow-sm ring-1 ring-ink/5">
            {LAST_WEEK.map((l) => (
              <li key={l.title} className="flex items-center justify-between py-2 text-[13px]">
                <span className={l.done ? '' : 'text-ink-faint'}>{l.title}</span>
                <span className={l.done ? 'text-moss-deep' : 'text-ink-faint'}>{l.done ? '✓' : '–'}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <BottomBar active="quests" />
    </Screen>
  )
}

// Q2 · one card: the three quests folded into a plan for the next walk, split by where you do it.
function WalkPlan() {
  const rows = QUESTS.flatMap((q) => q.targets.map((id) => ({ q, s: byId.get(id)! })))
  const out = rows.filter((r) => r.q.do === 'find')
  const home = rows.filter((r) => r.q.do === 'study')
  const Row = ({ q, s }: { q: Quest; s: Species }) => {
    const ok = isDone(q, s)
    return (
      <a href={`#/species/p1/${s.id}`} className="flex items-center gap-3 py-2">
        <MiniTile s={s} size={44} />
        <span className="min-w-0 flex-1">
          <span className={`block text-[14px] font-semibold ${ok ? 'text-ink-faint line-through' : ''}`}>{s.names.de}</span>
          <span className="block truncate text-[12px] text-ink-soft">{KIND[q.kind].emoji} {q.title}{q.any ? ' · einer reicht' : ''}</span>
        </span>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] ${ok ? 'bg-moss text-white' : 'border border-ink/15 text-transparent'}`}>✓</span>
      </a>
    )
  }
  return (
    <article className={`rounded-2xl bg-card px-3.5 py-3 shadow-sm ring-1 ring-ink/5`}>
      <h2 className="text-[17px] font-bold">Dein nächster Spaziergang</h2>
      <p className="mt-0.5 text-[13px] text-ink-soft">Laubwald mit Brombeerhecke, nach dem Regen. Drei Quests, ein Weg.</p>
      <h3 className="mt-3 text-[12px] font-semibold tracking-wide text-ink-faint uppercase">Draußen suchen</h3>
      <div className="divide-y divide-ink/5">{out.map((r) => <Row key={r.s.id} {...r} />)}</div>
      <h3 className="mt-3 text-[12px] font-semibold tracking-wide text-ink-faint uppercase">Zuhause studieren</h3>
      <div className="divide-y divide-ink/5">{home.map((r) => <Row key={r.s.id} {...r} />)}</div>
      <p className="mt-2 text-[11px] text-ink-faint">Warum jetzt und warum hier steht auf jeder Art.</p>
    </article>
  )
}
