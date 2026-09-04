import type { ReactNode } from 'react'
import { byId } from '../data'
import { GROUPS, MONTH, stateOf, type Facts, type Species } from '../types'
import { Silhouette } from './Silhouette'
import { SeenMark, StudiedMark } from './Marks'

export const KIND_DE: Record<string, string> = {
  eats: 'frisst', eatenBy: 'wird gefressen von', pollinates: 'bestäubt', pollinatedBy: 'wird bestäubt von',
  hostOf: 'Wirt für', hasHost: 'lebt an', parasiteOf: 'parasitiert', hasParasite: 'wird parasitiert von',
  visitsFlowersOf: 'besucht Blüten von', flowersVisitedBy: 'Blüten besucht von',
}
export const KIND_ORDER = ['eats', 'eatenBy', 'visitsFlowersOf', 'flowersVisitedBy', 'pollinates', 'pollinatedBy', 'hostOf', 'hasHost', 'parasiteOf', 'hasParasite']

export const groupOf = (s: Species) => GROUPS.find((g) => g.id === s.group)!
export const IUCN_DE: Record<string, string> = { 'Least concern': 'LC · nicht gefährdet', 'Near threatened': 'NT · potenziell gefährdet', Vulnerable: 'VU · gefährdet', 'Data deficient': 'DD · Datenlage unzureichend' }

/** Small tile with the target species' own dex state: silhouette, outline + book, or photo. */
// 🙋 Owner (2026-09-04): no state badges on mini tiles, they belong to the Dex grid only. The image itself (grey, amber ring, colour) still tells the state.
export function MiniTile({ s, size = 40 }: { s: Species; size?: number }) {
  const st = stateOf(s)
  const photo = s.state.userPhoto ?? s.image
  return (
    <span className="relative inline-block shrink-0 overflow-hidden rounded-lg bg-tile" style={{ width: size, height: size }}>
      {st === 'silhouette' && (s.image ? <img src={s.image.url} alt="" className="h-full w-full object-cover opacity-45 grayscale" /> : <Silhouette group={s.group} mode="fill" className="h-full w-full p-1 text-ink/50" />)}
      {st === 'studied' && (s.image ? <img src={s.image.url} alt="" className="h-full w-full object-cover opacity-70 grayscale ring-2 ring-amber ring-inset" /> : <Silhouette group={s.group} mode="outline" className="h-full w-full p-1 text-amber" />)}
      {(st === 'seen' || st === 'both') && photo && <img src={photo.url} alt="" className="h-full w-full object-cover" />}
    </span>
  )
}

export function SpeciesChip({ id }: { id: string }) {
  const t = byId.get(id)!
  return (
    <button className="flex shrink-0 items-center gap-2 rounded-xl border border-ink/10 bg-card py-1 pr-3 pl-1 text-left shadow-sm">
      <MiniTile s={t} size={36} />
      <span className="text-[13px] leading-tight">{t.names.de}</span>
    </button>
  )
}

export function Attribution({ s, className = '' }: { s: Species; className?: string }) {
  const p = s.state.userPhoto ?? s.image
  if (!p) return null
  return (
    <p className={`text-[11px] text-ink-faint ${className}`}>
      {s.state.userPhoto ? 'Dein Foto' : <>Foto: {p.author.split(/[,(]/)[0].trim()} · {p.license} · <span className="underline decoration-ink/20">Wikimedia Commons</span></>}
    </p>
  )
}

export function Names({ s, size = 'lg' }: { s: Species; size?: 'lg' | 'md' }) {
  return (
    <div>
      <h1 className={`${size === 'lg' ? 'text-[24px]' : 'text-[19px]'} leading-tight font-bold`}>{s.names.de}</h1>
      <p className="text-[13px] text-ink-soft"><i>{s.names.sci}</i>{s.names.en !== s.names.sci && <> · {s.names.en}</>}</p>
    </div>
  )
}

export function Tags({ s }: { s: Species }) {
  const g = groupOf(s)
  return (
    <div className="flex flex-wrap gap-1.5">
      <Tag>{g.emoji} {g.one}</Tag>
      {s.tags.map((t) => <Tag key={t}>{t}</Tag>)}
      {s.iucn && <Tag>{IUCN_DE[s.iucn] ?? s.iucn}</Tag>}
    </div>
  )
}
const Tag = ({ children }: { children: ReactNode }) => <span className="rounded-full bg-tile px-2.5 py-1 text-[12px] text-ink-soft">{children}</span>

export function StateRow({ s }: { s: Species }) {
  const st = stateOf(s)
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className={`flex items-center gap-1.5 ${s.state.studied ? 'text-amber' : 'text-ink-faint'}`}>
        <StudiedMark size={16} className={s.state.studied ? '' : 'opacity-30 grayscale'} /> {s.state.studied ? 'studiert' : 'noch nicht studiert'}
      </span>
      <span className={`flex items-center gap-1.5 ${s.state.seen ? 'text-moss-deep' : 'text-ink-faint'}`}>
        <SeenMark size={16} className={s.state.seen ? '' : 'opacity-30 grayscale'} /> {s.state.seen ? `entdeckt · ${Number(s.state.seenFirst!.slice(8))}. Sep` : 'noch nicht entdeckt'}
      </span>
    </div>
  )
}

export function Intro({ s }: { s: Species }) {
  if (!s.intro) return <p className="text-[14px] text-ink-faint">Noch keine Einleitung für diese Art.</p>
  return (
    <p className="text-[15px] leading-snug">{s.intro.text}</p>
  )
}

export function FungusNotice({ s }: { s: Species }) {
  if (s.group !== 'fungus') return null
  return (
    <div className="rounded-xl border border-amber/40 bg-amber-soft/50 px-3 py-2 text-[13px] leading-snug text-ink">
      <p>🍄 <b>Kein Speisepilz-Ratgeber.</b> Diese App macht keine Aussage über Essbarkeit oder Giftigkeit und übernimmt dafür keine Gewähr. Bestimme nichts zum Verzehr auf Grundlage einer App.</p>
      <p className="mt-1 text-[11px] text-ink-soft">Der Einleitungstext stammt aus Wikipedia und ist nicht von uns geprüft.</p>
    </div>
  )
}

export function MonthStrip({ s }: { s: Species }) {
  const L = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  const max = Math.max(...s.months), min = Math.min(...s.months)
  const flat = max === min
  const peak = s.months.map((m, i) => (m === max ? i : -1)).filter((i) => i >= 0)
  const summary = flat ? 'Ganzjährig anzutreffen' : `Hauptzeit ${L[peak[0]]}–${L[peak[peak.length - 1]]}`
  const now = s.months[MONTH]
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-ink/5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[14px] font-semibold">{summary}</span>
        <span className="text-[12px] text-moss-deep">{now === 3 ? 'jetzt gute Chancen' : now === 2 ? 'jetzt möglich' : now === 1 ? 'jetzt selten' : 'jetzt kaum'}</span>
      </div>
      <div className="flex h-14 items-end gap-1">
        {s.months.map((m, i) => (
          <div key={i} className={`flex-1 rounded-sm ${i === MONTH ? 'bg-moss' : m ? 'bg-moss/25' : 'bg-tile'}`} style={{ height: `${Math.max(8, (m / 3) * 100)}%` }} />
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-ink-faint">{L.map((l, i) => <span key={i} className={`flex-1 text-center ${i === MONTH ? 'font-semibold text-moss-deep' : ''}`}>{l[0]}</span>)}</div>
    </div>
  )
}

// Real OpenStreetMap tiles around Mainz-Bingen, zoom 10 (~27 km per tile). Overlay: the coarse 10 km cell, never a pin.
export function MapStub({ s, className = '' }: { s: Species; className?: string }) {
  return (
    <button className={`relative block w-full overflow-hidden rounded-2xl bg-tile text-left ring-1 ring-ink/5 ${className}`}>
      <div className="flex h-40 w-full">
        {[534, 535].map((x) => <img key={x} src={`https://tile.openstreetmap.org/10/${x}/347.png`} alt="" className="h-full w-1/2 object-cover" />)}
      </div>
      <div className="pointer-events-none absolute inset-0">
        {s.state.seen
          ? <div className="absolute top-[38%] left-[46%] h-[22%] w-[18%] rounded-md border-2 border-moss bg-moss/30" />
          : <><div className="absolute top-[20%] left-[20%] h-[22%] w-[18%] rounded-md bg-moss/20" /><div className="absolute top-[38%] left-[46%] h-[22%] w-[18%] rounded-md bg-moss/35" /><div className="absolute top-[60%] left-[68%] h-[22%] w-[18%] rounded-md bg-moss/25" /></>}
      </div>
      <span className="absolute top-2 left-2 rounded-full bg-card/90 px-2 py-0.5 text-[12px] font-medium text-ink shadow-sm">{s.state.seen ? 'Deine Sichtung · 10 km-Zelle' : 'Vorkommen · GBIF · 10 km-Zellen'}</span>
      <span className="absolute right-2 bottom-2 rounded-full bg-ink/80 px-2.5 py-1 text-[12px] font-medium text-paper">Karte öffnen ›</span>
      <span className="absolute bottom-1 left-1.5 text-[9px] text-ink-soft">© OpenStreetMap</span>
    </button>
  )
}

export const groupedInteractions = (s: Species) => {
  const m = new Map<string, string[]>()
  for (const ix of s.interactions) m.set(ix.kind, [...(m.get(ix.kind) ?? []), ix.target])
  return KIND_ORDER.filter((k) => m.has(k)).map((k) => ({ kind: k, label: KIND_DE[k], targets: m.get(k)! }))
}

export function EmptyEcology({ s }: { s: Species }) {
  return (
    <div className="rounded-xl border border-dashed border-ink/15 px-3 py-3 text-[13px] leading-snug text-ink-soft">
      Für {s.names.de} kennt GloBI noch keine Beziehungen zu anderen Arten deines Dex. Das heißt nicht, dass es keine gibt.
    </div>
  )
}

// ── Sections (spike, 2026-09-04, owner's sketch) ─────────────────────────────
export function Section({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {meta && <span className="shrink-0 text-[11px] text-ink-faint">{meta}</span>}
      </div>
      {children}
    </section>
  )
}

// Steckbrief: a two-column grid. Facts from fixtures/facts.json, plus a Status cell that replaces the old tag row,
// and a full-width Stimme cell. An odd last cell stretches to full width.
const FACT_ROWS: { key: keyof Omit<Facts, 'lookalikes' | 'sound'>; emoji: string; label: string }[] = [
  { key: 'size', emoji: '📏', label: 'Größe' },
  { key: 'lifespan', emoji: '⏳', label: 'Alter' },
  { key: 'reproduction', emoji: '🥚', label: 'Nachwuchs' },
  { key: 'habitat', emoji: '🌳', label: 'Lebensraum' },
  { key: 'migration', emoji: '🧭', label: 'Zug' },
]
/** One Quellen line per page (🙋 owner, 2026-09-04): the photo caption stays with the image because CC BY demands it there;
 *  everything else is attributed once, at the bottom. Wikipedia text is the only other legal must (CC BY-SA); Wikidata is CC0,
 *  AnAge, GBIF, GloBI and xeno-canto are courtesy. */
export function Sources({ s, className = '' }: { s: Species; className?: string }) {
  const data = factSources(s).join(', ')
  const parts = [
    s.intro && `Text: Wikipedia, ${s.intro.license}`,
    s.facts && `Daten: ${data}`,
    'Vorkommen: GBIF',
    s.interactions.length > 0 && 'Ökologie: GloBI',
    s.facts?.sound && `Stimme: ${s.facts.sound.source}`,
  ].filter(Boolean)
  return <p className={`text-[11px] leading-snug text-ink-faint ${className}`}><span className="font-semibold">Quellen</span> · {parts.join(' · ')}</p>
}
export const factSources = (s: Species) => [...new Set(['Wikidata', ...Object.values(s.facts ?? {}).flatMap((v) => (v && !Array.isArray(v) && 'source' in v ? [v.source] : []))])]

const Cell = ({ emoji, label, wide = false, children }: { emoji: string; label: string; wide?: boolean; children: ReactNode }) => (
  <div className={`rounded-2xl bg-card px-3 py-2.5 shadow-sm ring-1 ring-ink/5 ${wide ? 'col-span-2' : ''}`}>
    <div className="text-[11px] text-ink-faint">{emoji} {label}</div>
    <div className="mt-0.5 text-[14px] leading-snug">{children}</div>
  </div>
)

export function FactsGrid({ s }: { s: Species }) {
  const f = s.facts ?? {}
  const g = groupOf(s)
  const rows: { key: string; emoji: string; label: string; text: string; detail?: string }[] = FACT_ROWS.filter((r) => f[r.key]).map((r) => ({ key: r.key, emoji: r.emoji, label: r.label, text: f[r.key]!.text, detail: f[r.key]!.detail }))
  rows.push({ key: 'status', emoji: g.emoji, label: 'Status', text: [g.one, ...s.tags].join(' · '), detail: s.iucn ? (IUCN_DE[s.iucn] ?? s.iucn) : undefined })
  const odd = rows.length % 2 === 1
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r, i) => (
          <Cell key={r.key} emoji={r.emoji} label={r.label} wide={odd && i === rows.length - 1}>
            <span className="font-semibold">{r.text}</span>
            {r.detail && <span className="block text-[12px] text-ink-soft">{r.detail}</span>}
          </Cell>
        ))}
      </div>
      {f.sound && (
        <button className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-card px-3 py-2.5 text-left shadow-sm ring-1 ring-ink/5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss text-white"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-ink-faint">🔊 Stimme</span>
            <span className="block text-[13px] leading-snug">{f.sound.text}</span>
          </span>
        </button>
      )}
      {!s.facts && <p className="mt-2 text-[12px] leading-snug text-ink-soft">Größe, Alter und Nachwuchs fehlen noch. Sie kommen aus AnAge und Wikipedia, sobald sie dort stehen.</p>}
    </div>
  )
}

export function Lookalikes({ s }: { s: Species }) {
  const list = s.facts?.lookalikes
  if (!list || list.length === 0) return <p className="rounded-xl border border-dashed border-ink/15 px-3 py-3 text-[13px] leading-snug text-ink-soft">Für {s.names.de} kennen wir noch keine Doppelgänger in deiner Region.</p>
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
      {list.map((l, i) => {
        const t = l.id ? byId.get(l.id) : undefined
        return (
          <a key={i} href={t ? `#/species/p1/${t.id}` : undefined} className={`flex w-[172px] shrink-0 items-center gap-2 rounded-2xl bg-card p-2 pr-3 shadow-sm ring-1 ring-ink/5 ${t ? '' : 'opacity-80'}`}>
            {t ? <MiniTile s={t} size={44} /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tile text-[16px] text-ink-faint">?</span>}
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{t ? t.names.de : l.name}</span>
              <span className="line-clamp-2 text-[11px] leading-tight text-ink-soft">{l.hint}</span>
              {!t && <span className="block text-[10px] text-ink-faint">nicht in deinem Dex</span>}
            </span>
          </a>
        )
      })}
    </div>
  )
}
