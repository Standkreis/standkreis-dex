import { useState } from 'react'
import raw from '../../fixtures/sightings.json'
import { counters, species } from '../data'
import { GROUPS } from '../types'
import { MiniTile } from '../components/Species'
import { Icon } from '../components/Marks'
import { BottomBar, Screen } from '../components/Shell'
import { XP, xpById } from '../xp'

// Screen 10 · Du as a profile (mocked 2026-09-04 on owner request). Two variants:
//   default  · 🙋 owner pick 2026-09-04: XP from diary entries and quests, a level with a name. Personal progression, not
//              competition: never shared, never ranked, no decay, no streak. Repeat finds of one species earn XP once a
//              month, so volume is not the game. Reverses record Q8 "no XP"; needs a record entry, not just a spec edit.
//   ?v=plain · the same page without XP, kept for the record.

type Entry = { id: string; kind: 'find' | 'study'; at: string; species: string; photo?: boolean }
const entries = (raw as Entry[]).slice().sort((a, b) => a.at.localeCompare(b.at))
const finds = entries.filter((e) => e.kind === 'find')
const studies = entries.filter((e) => e.kind === 'study')
const firstFinds = new Set<string>(); const erst = finds.filter((e) => (firstFinds.has(e.species) ? false : (firstFinds.add(e.species), true)))
const monthsWithFind = new Set(finds.map((e) => Number(e.at.slice(5, 7)) - 1))
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const dm = (at: string) => `${at.slice(8, 10)}. ${MON[Number(at.slice(5, 7)) - 1]}`
const WEEKS = [{ w: 33, done: [true, false, true] }, { w: 34, done: [true, true, true] }, { w: 35, done: [true, false, false] }, { w: 36, done: [false, false, false] }] // this week open
const QUESTS_DONE = WEEKS.flatMap((w) => w.done).filter(Boolean).length

// V1 · the XP model as asked (tariff and per-entry XP live in src/xp.ts, shared with the Tagebuch).
const xpEntries = entries.map((e) => [e, xpById.get(e.id) ?? 0] as const)
const xpTotal = xpEntries.reduce((n, [, x]) => n + x, 0) + QUESTS_DONE * XP.quest
const xpWeek = xpEntries.filter(([e]) => e.at >= '2026-08-31').reduce((n, [, x]) => n + x, 0) + 0 // this week's quests are open
const STEP = 150
const level = 1 + Math.floor(xpTotal / STEP)
const into = xpTotal - (level - 1) * STEP

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`rounded-2xl bg-card p-4 shadow-sm ring-1 ring-ink/5 ${className}`}>{children}</div>
const H = ({ children, meta }: { children: React.ReactNode; meta?: string }) => (
  <div className="mb-2 flex items-baseline justify-between px-1"><h2 className="text-[15px] font-bold text-ink-soft">{children}</h2>{meta && <span className="text-[12px] text-ink-faint">{meta}</span>}</div>
)

/** Region: the same bar as the Dex header, nothing else. */
function Region() {
  const studiedOnly = counters.studied - counters.both
  return (
    <Card>
      <p className="text-[12px] font-semibold tracking-wide text-ink-faint uppercase">Mainz-Bingen · ganzes Jahr</p>
      <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-tile">
        {studiedOnly > 0 && <div className="bg-amber" style={{ width: `${(studiedOnly / counters.total) * 100}%` }} />}
        <div className="bg-moss" style={{ width: `${(counters.seen / counters.total) * 100}%` }} />
      </div>
      <p className="mt-2 text-[13px]">
        <span className="font-semibold text-amber">{counters.studied} studiert</span><span className="mx-1 text-ink-faint">·</span>
        <span className="font-semibold text-moss-deep">{counters.seen} entdeckt</span><span className="mx-1 text-ink-faint">·</span>
        <span className="text-ink-soft">{counters.total} möglich</span>
      </p>
    </Card>
  )
}

function Groups() {
  const rows = GROUPS.map((g) => {
    const all = species.filter((s) => s.group === g.id)
    return { g, total: all.length, seen: all.filter((s) => s.state.seen).length, studied: all.filter((s) => s.state.studied).length }
  }).filter((r) => r.total).sort((a, b) => b.total - a.total)
  return (
    <Card className="space-y-3">
      {rows.map(({ g, total, seen, studied }) => (
        <div key={g.id} className="flex items-center gap-3">
          <span className="w-6 text-center text-[18px]">{g.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-[13px]"><span className="font-semibold">{g.de}</span><span className="text-ink-faint">{studied > seen ? `${studied} studiert · ` : ''}{seen} von {total} entdeckt</span></div>
            <div className="mt-1 flex h-2 gap-0.5 overflow-hidden rounded-full bg-tile">
              {studied > seen && <div className="bg-amber" style={{ width: `${((studied - seen) / total) * 100}%` }} />}
              {seen > 0 && <div className="bg-moss" style={{ width: `${(seen / total) * 100}%` }} />}
            </div>
          </div>
        </div>
      ))}
    </Card>
  )
}

/** The year: which months carry a find. Gaps pull, like silhouettes do. */
function Year() {
  return (
    <Card>
      <div className="flex justify-between gap-1">
        {MONTHS.map((m, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className={`h-9 w-full rounded-md ${monthsWithFind.has(i) ? 'bg-moss' : i > 8 ? 'border border-dashed border-ink/15' : 'bg-tile'}`} />
            <span className={`text-[10px] ${i === 8 ? 'font-bold text-ink' : 'text-ink-faint'}`}>{m}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-ink-faint">{monthsWithFind.size === 1 ? 'Ein Monat mit Entdeckungen.' : `${monthsWithFind.size} Monate mit Entdeckungen.`} Der Oktober bringt Pilze und die Ankömmlinge, die du diese Woche studierst.</p>
    </Card>
  )
}

function QuestsRow() {
  return (
    <Card className="flex items-center justify-between">
      {WEEKS.map(({ w, done }) => (
        <div key={w} className="flex flex-col items-center gap-1.5">
          <div className="flex gap-1">{done.map((d, i) => <span key={i} className={`h-3.5 w-3.5 rounded-full ${d ? 'bg-moss' : w === 36 ? 'border border-dashed border-ink/25' : 'bg-tile'}`} />)}</div>
          <span className="text-[11px] text-ink-faint">{w === 36 ? 'diese Woche' : `KW ${w}`}</span>
        </div>
      ))}
    </Card>
  )
}

function Latest() {
  const last = [...erst].reverse().slice(0, 4)
  return (
    <div className="grid grid-cols-4 gap-2">
      {last.map((e) => { const s = species.find((x) => x.id === e.species)!; return (
        <a key={e.id} href={`#/species/p1/${s.id}`} className="rounded-xl bg-card p-1.5 shadow-sm ring-1 ring-ink/5">
          <MiniTile s={s} size={72} />
          <p className="mt-1 truncate text-[11px] font-semibold">{s.names.de}</p>
          <p className="text-[10px] text-ink-faint">{dm(e.at)}</p>
        </a>
      ) })}
    </div>
  )
}

/** Avatar: the user's own photo, picked in Einstellungen. Initials until there is one. */
function Avatar({ size = 64 }: { size?: number }) {
  return (
    <span className="relative inline-block shrink-0">
      <span className="flex items-center justify-center rounded-full bg-sky-soft text-sky-deep font-bold ring-2 ring-sky/40" style={{ width: size, height: size, fontSize: size * 0.36 }}>SR</span>
      <span className="absolute -right-1 -bottom-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-sky px-1.5 text-[13px] font-bold text-white ring-[3px] ring-card">{level}</span>
    </span>
  )
}

/** 🙋 Owner: name, not a level name; no weekly XP; tariff behind an info icon. */
function ProfileCard({ onInfo }: { onInfo: () => void }) {
  return (
    <Card className="flex items-center gap-4">
      <Avatar />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-[20px] leading-tight font-bold">Sven</p>
          <button onClick={onInfo} aria-label="Was sind XP?" className="flex h-8 w-8 items-center justify-center rounded-full bg-tile text-ink-soft"><Icon name="info" size={16} /></button>
        </div>
        <p className="text-[12px] font-semibold tracking-wide text-ink-faint uppercase">Level {level} · Mainz-Bingen</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-tile"><div className="h-full bg-sky" style={{ width: `${(into / STEP) * 100}%` }} /></div>
        <p className="mt-1 text-[12px] text-ink-soft">{into} / {STEP} XP bis Level {level + 1}</p>
      </div>
    </Card>
  )
}

/** Drawer behind the info icon: where XP come from and what they are not. */
function XpDrawer({ onClose }: { onClose: () => void }) {
  const rows: [string, string, string][] = [
    ['🟢 Neu entdeckt', `+${XP.erst}`, 'Das erste Mal, dass du eine Art einträgst. Das Bild im Dex füllt sich.'],
    ['📖 Studiert', `+${XP.study}`, 'Eine Art gelesen und die zwei Fragen am Ende beantwortet.'],
    ['🧭 Quest erledigt', `+${XP.quest}`, 'Eine der drei Wochen-Quests, die aus deinem Dex entstehen.'],
    ['📷 Foto zur Sichtung', `+${XP.photo}`, 'Ein eigenes Foto beim Eintragen. Kein Muss.'],
    ['🔁 Wiederentdeckt', `+${XP.find}`, 'Eine bekannte Art in einem neuen Monat. Zählt einmal pro Art und Monat, egal wie oft du sie siehst.'],
  ]
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onClose}>
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-paper px-4 pt-3 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <h2 className="text-[20px] font-bold">Wie du Level steigst</h2>
        <p className="mt-1 text-[14px] text-ink-soft">XP messen, was du über die Natur vor deiner Haustür neu studiert und entdeckt hast. Alle {STEP} XP ein Level.</p>
        <ul className="mt-4 divide-y divide-ink/5 rounded-2xl bg-card shadow-sm ring-1 ring-ink/5">
          {rows.map(([t, xp, why]) => (
            <li key={t} className="flex gap-3 px-4 py-3">
              <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold">{t}</p><p className="text-[13px] leading-snug text-ink-soft">{why}</p></div>
              <span className="shrink-0 text-[15px] font-bold text-sky-deep">{xp} XP</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-5 text-[15px] font-bold">Was XP nicht sind</h3>
        <ul className="mt-2 space-y-1.5 text-[14px] text-ink-soft">
          <li>🙅 <b className="text-ink">Kein Vergleich.</b> Niemand sieht dein Level, es steht auf keiner Karte, die du teilst.</li>
          <li>🧊 <b className="text-ink">Kein Verfall.</b> Pausen kosten nichts. Es gibt keine Serie.</li>
          <li>🐦 <b className="text-ink">Keine Seltenheit.</b> Eine Amsel bringt so viel wie ein Rotmilan. Nichts lockt dich zu den Arten, die Ruhe brauchen.</li>
          <li>🤝 <b className="text-ink">Ehrlich.</b> Eine Sichtung ohne Foto zählt genauso. Du betrügst nur dich.</li>
        </ul>
        <button onClick={onClose} className="mt-6 block w-full rounded-2xl bg-ink py-3 text-center text-[15px] font-bold text-paper">Alles klar</button>
      </div>
    </div>
  )
}

export function You() {
  const xp = !location.hash.includes('v=plain')
  const [info, setInfo] = useState(location.hash.includes('xpinfo'))
  return (
    <Screen>
      <header className="px-4 pt-3 pb-3">
        <div className="flex h-10 items-center justify-between">
          <h1 className="text-[28px] leading-none font-bold tracking-tight">Du</h1>
          <div className="flex items-center gap-2">
            <a href="#/settings" aria-label="Einstellungen" className="flex h-9 w-9 items-center justify-center rounded-full bg-tile text-ink-soft"><Icon name="gear" size={18} /></a>
          </div>
        </div>
      </header>
      <div className="space-y-5 px-4">
        {xp && <ProfileCard onInfo={() => setInfo(true)} />}
        <Region />
        <section><H meta="studiert · entdeckt">Nach Gruppe</H><Groups /></section>
        <section><H meta="2026">Dein Jahr</H><Year /></section>
        <section><H meta="3 pro Woche">Quests</H><QuestsRow /></section>
        <section><H>Zuletzt neu</H><Latest /></section>
        <p className="pb-2 text-center text-[12px] leading-snug text-ink-faint">{xp ? 'XP kommen aus Neuentdeckungen, Studiertem und Quests. Nur für dich, kein Vergleich.' : 'Zwei Zahlen, nach Gruppe und Monat aufgeteilt. Sonst nichts, was steigt.'}</p>
      </div>
      {info && <XpDrawer onClose={() => setInfo(false)} />}
      <BottomBar active="you" />
    </Screen>
  )
}
