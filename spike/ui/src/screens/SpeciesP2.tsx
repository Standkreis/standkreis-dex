import { byId } from '../data'
import type { Species } from '../types'
import GridA from './GridA'
import { Icon } from '../components/Marks'
import { Attribution, EmptyEcology, FungusNotice, Intro, MapStub, MiniTile, MonthStrip, Names, Sources, StateRow, Tags, KIND_DE } from '../components/Species'

// P2 · Bottom sheet over the grid · small hero · ecology as a radial graph · single floating action
function Radial({ s }: { s: Species }) {
  const ix = s.interactions
  const n = ix.length
  const R = 118, cx = 170, cy = 150
  return (
    <svg viewBox="0 0 340 300" className="w-full">
      {ix.map((e, i) => {
        const a = -Math.PI / 2 + (i / n) * 2 * Math.PI
        const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a)
        const mx = cx + (R * 0.5) * Math.cos(a), my = cy + (R * 0.5) * Math.sin(a)
        const inbound = /By|has/.test(e.kind)
        return (
          <g key={e.target + e.kind}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={inbound ? '#b8701a' : '#2f6f45'} strokeWidth="1.5" strokeDasharray={inbound ? '3 3' : undefined} />
            <rect x={mx - 30} y={my - 7} width="60" height="14" rx="7" fill="#f5f2ea" />
            <text x={mx} y={my + 3.5} textAnchor="middle" fontSize="8.5" fill="#5b675f">{KIND_DE[e.kind]}</text>
          </g>
        )
      })}
      <circle cx={cx} cy={cy} r="26" fill="#2f6f45" />
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">{s.names.de}</text>
      {ix.map((e, i) => {
        const a = -Math.PI / 2 + (i / n) * 2 * Math.PI
        const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a)
        const t = byId.get(e.target)!
        return (
          <foreignObject key={e.target + e.kind + 'n'} x={x - 30} y={y - 22} width="60" height="60">
            <div className="flex flex-col items-center gap-0.5"><MiniTile s={t} size={34} /><span className="max-w-[60px] truncate text-[9px] leading-none text-ink">{t.names.de}</span></div>
          </foreignObject>
        )
      })}
    </svg>
  )
}

export default function SpeciesP2({ s }: { s: Species }) {
  const photo = s.state.userPhoto ?? s.image
  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none h-[180px] overflow-hidden opacity-60"><GridA /></div>
      <div className="fixed inset-0 z-30 flex items-end bg-ink/30">
        <div className="max-h-[92%] w-full overflow-y-auto rounded-t-3xl bg-paper pb-24">
          <div className="sticky top-0 z-10 bg-paper pt-2"><div className="mx-auto h-1 w-10 rounded-full bg-ink/20" /></div>
          <div className="space-y-3 px-4 pt-3">
            <div className="flex gap-3">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-tile">{photo && <img src={photo.url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1 space-y-1.5"><Names s={s} size="md" /><StateRow s={s} /></div>
            </div>
            <Attribution s={s} />
            <Tags s={s} />
            <FungusNotice s={s} />
            <Intro s={s} />
            <div className="grid grid-cols-2 gap-3">
              <MonthStrip s={s} />
              <MapStub s={s} />
            </div>
            <section>
              <h2 className="text-[17px] font-bold">Ökologie</h2>
              {s.interactions.length ? <Radial s={s} /> : <div className="mt-2"><EmptyEcology s={s} /></div>}
            </section>
            <Sources s={s} />
          </div>
          <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center">
            <div className="flex items-center gap-1 rounded-full bg-ink p-1 shadow-lg">
              <button className="rounded-full px-4 py-2.5 text-[14px] font-semibold text-amber-soft"><span className="inline-flex items-center gap-1.5"><Icon name="book" size={16} /> {s.state.studied ? 'Studiert ✓' : 'Studiert'}</span></button>
              <button className="rounded-full bg-moss px-5 py-2.5 text-[14px] font-semibold text-white">＋ Entdeckt</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
