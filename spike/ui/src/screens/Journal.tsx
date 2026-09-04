import { useState } from 'react'
import raw from '../../fixtures/sightings.json'
import { byId } from '../data'
import { MiniTile } from '../components/Species'
import { BottomBar, Screen } from '../components/Shell'
import { xpById } from '../xp'

// Screen 8 · Tagebuch (mocked 2026-09-04). Record Q1: the sighting is the atom, the dex is derived. Newest first, Letterboxd's
// diary as the model. Finds and studies in one stream (the owner's bar sketch says "log of learning"). Places shown as the
// Gemeinde; the exact point is stored, shared only coarse. "Neu entdeckt" is derived: the first sighting of a species.
// XP per row (🙋 owner, 2026-09-04): a quiet blue "+25" on the right. A repeat in the same month earns nothing and shows nothing.
// No photo thumb on the right (🙋 owner): the mini tile already shows the user's photo once it exists; 📷 in the meta line marks a photographed row.

type Entry = { id: string; kind: 'find' | 'study'; at: string; species: string; place?: string; photo?: boolean; note?: string; evidence?: string; wild?: boolean }
const entries = (raw as Entry[]).slice().sort((a, b) => b.at.localeCompare(a.at))
const firstFind = new Map<string, string>()
for (const e of [...entries].reverse()) if (e.kind === 'find' && !firstFind.has(e.species)) firstFind.set(e.species, e.id)

const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const TODAY = '2026-09-04'
const dayLabel = (d: string) => {
  const dt = new Date(d + 'T12:00')
  const base = `${DAYS[dt.getDay()]} ${dt.getDate()}. ${MONTHS[dt.getMonth()]}`
  return d === TODAY ? `Heute · ${base}` : d === '2026-09-03' ? `Gestern · ${base}` : base
}
const time = (at: string) => at.slice(11)

type Filter = 'all' | 'find' | 'study'

// One chip shape for the three row states: amber = studiert, green = neu entdeckt, quiet = wiederentdeckt (a repeat sighting).
const TONE = { amber: 'bg-amber-soft text-amber', moss: 'bg-moss-soft text-moss-deep', tile: 'bg-tile text-ink-soft' }
const Xp = ({ id }: { id: string }) => { const x = xpById.get(id) ?? 0; return x > 0 ? <span className="shrink-0 text-[12px] font-semibold text-sky-deep">+{x}</span> : null }
const Chip = ({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) => (
  <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${TONE[tone]}`}>{children}</span>
)

function Row({ e }: { e: Entry }) {
  const s = byId.get(e.species)!
  const first = firstFind.get(e.species) === e.id
  if (e.kind === 'study') {
    return (
      <a href={`#/species/p1/${s.id}`} className="flex items-center gap-3 py-2">
        <MiniTile s={s} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 text-[14px] font-semibold">{s.names.de}<Chip tone="amber">Studiert</Chip></span>
          <span className="block text-[12px] text-ink-soft">{time(e.at)} · zuhause</span>
        </span>
        <Xp id={e.id} />
      </a>
    )
  }
  return (
    <a href={`#/species/p1/${s.id}`} className="flex items-center gap-3 py-2">
      <MiniTile s={s} size={44} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5 text-[14px] font-semibold">
          {s.names.de}
          {first ? <Chip tone="moss">Neu entdeckt</Chip> : <Chip tone="tile">Wiederentdeckt</Chip>}
        </span>
        <span className="block truncate text-[12px] text-ink-soft">{time(e.at)} · {e.place}{e.evidence === 'photographed' && ' · 📷'}{e.note && <> · <i>{e.note}</i></>}</span>
      </span>
      <Xp id={e.id} />
    </a>
  )
}

// T1 · grouped by day, one card per day
function ByDay({ list }: { list: Entry[] }) {
  const days = [...new Set(list.map((e) => e.at.slice(0, 10)))]
  return (
    <div className="space-y-4">
      {days.map((d) => {
        const es = list.filter((e) => e.at.startsWith(d))
        const places = [...new Set(es.filter((e) => e.place).map((e) => e.place!.split(' · ')[0]))]
        return (
          <section key={d}>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <h2 className="text-[15px] font-bold">{dayLabel(d)}</h2>
              <span className="text-[12px] text-ink-faint">{places.join(', ') || 'zuhause'}</span>
            </div>
            <div className="divide-y divide-ink/5 rounded-2xl bg-card px-3 shadow-sm ring-1 ring-ink/5">{es.map((e) => <Row key={e.id} e={e} />)}</div>
          </section>
        )
      })}
    </div>
  )
}

// T2 · Letterboxd diary: a date column, one continuous list
function Diary({ list }: { list: Entry[] }) {
  let last = ''
  return (
    <div className="rounded-2xl bg-card px-3 shadow-sm ring-1 ring-ink/5">
      {list.map((e) => {
        const d = e.at.slice(0, 10)
        const show = d !== last
        last = d
        const dt = new Date(d + 'T12:00')
        return (
          <div key={e.id} className="flex gap-3 border-b border-ink/5 last:border-0">
            <div className={`w-9 shrink-0 pt-2.5 text-center ${show ? '' : 'invisible'}`}>
              <div className="text-[10px] font-semibold tracking-wide text-ink-faint uppercase">{MONTHS[dt.getMonth()]}</div>
              <div className="text-[18px] leading-none font-bold">{dt.getDate()}</div>
            </div>
            <div className="min-w-0 flex-1"><Row e={e} /></div>
          </div>
        )
      })}
    </div>
  )
}

export function Journal() {
  const diary = location.hash.includes('v=diary')
  const [filter, setFilter] = useState<Filter>('all')
  const list = entries.filter((e) => filter === 'all' || e.kind === filter)
  const Pill = ({ f, children }: { f: Filter; children: string }) => (
    <button onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${filter === f ? 'bg-moss/10 text-moss-deep ring-1 ring-moss' : 'bg-tile text-ink-soft'}`}>{children}</button>
  )
  return (
    <Screen>
      <header className="px-4 pt-3 pb-3">
        <div className="flex h-10 items-center justify-between">
          <h1 className="text-[28px] leading-none font-bold tracking-tight">Tagebuch</h1>
        </div>
        <div className="mt-3 flex gap-2"><Pill f="all">Alle</Pill><Pill f="study">Studiert</Pill><Pill f="find">Entdeckungen</Pill></div>
      </header>
      <div className="px-4">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 px-3 py-4 text-center text-[13px] text-ink-soft">Noch nichts hier. Der erste Eintrag kommt vom ＋ unten.</p>
        ) : diary ? <Diary list={list} /> : <ByDay list={list} />}
        <p className="mt-4 text-[11px] leading-snug text-ink-faint">Orte sind genau gespeichert und hier als Gemeinde gezeigt. Geteilt wird nur grob. Export und Löschen unter „Du“.</p>
      </div>
      <BottomBar active="journal" />
    </Screen>
  )
}
