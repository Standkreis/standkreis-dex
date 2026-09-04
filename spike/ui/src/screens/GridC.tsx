import { species } from '../data'
import { MONTH, stateOf, type Species } from '../types'
import { Silhouette } from '../components/Silhouette'
import { StudiedMark } from '../components/Marks'
import { Header, FilterBar, BottomBar, Screen } from '../components/Shell'

// C · "Jetzt draußen" first · 3 columns · card cells with a state line · photo framed, not cut
const fmt = (iso: string) => `${Number(iso.slice(8))}. Sep`

function Card({ s }: { s: Species }) {
  const st = stateOf(s)
  const photo = s.state.userPhoto ?? s.image
  const filled = (st === 'seen' || st === 'both') && photo
  return (
    <button className={`flex flex-col overflow-hidden rounded-2xl text-left ${filled ? 'bg-card shadow-sm ring-1 ring-ink/5' : st === 'studied' ? 'bg-card ring-1 ring-amber/50' : 'bg-tile'}`}>
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {st === 'silhouette' && <Silhouette group={s.group} mode="fill" className="h-full w-full p-3 text-ink/45" />}
        {st === 'studied' && <Silhouette group={s.group} mode="outline" className="h-full w-full p-3 text-amber" bg="white" />}
        {filled && <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />}
        {filled && s.state.userPhoto && <span className="absolute top-1.5 left-1.5 rounded-full bg-white/90 px-1.5 text-[9px] font-semibold text-moss">dein Foto</span>}
      </div>
      <div className="px-2 pt-1.5 pb-2">
        <div className={`truncate text-[13px] leading-tight ${st === 'silhouette' ? 'text-ink-soft' : 'font-semibold'}`}>{s.names.de}</div>
        <div className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[10px] leading-none">
          {st === 'silhouette' && <span className="text-ink-faint">noch nicht</span>}
          {(st === 'studied' || st === 'both') && <><StudiedMark size={12} /><span className="text-amber">{st === 'both' ? '' : 'studiert'}</span></>}
          {(st === 'seen' || st === 'both') && <span className="text-moss">👁 {fmt(s.state.seenFirst!)}</span>}
        </div>
        {filled && <div className="mt-1 truncate text-[8px] leading-none text-ink-faint">{s.state.userPhoto ? 'von dir' : `${photo.author.split(/[,(]/)[0].trim()} · ${photo.license}`}</div>}
      </div>
    </button>
  )
}

export default function GridC() {
  const now = species.filter((s) => s.months[MONTH] === 3).sort((a, b) => a.names.de.localeCompare(b.names.de))
  const later = species.filter((s) => s.months[MONTH] < 3).sort((a, b) => b.months[MONTH] - a.months[MONTH] || a.names.de.localeCompare(b.names.de))
  const Section = ({ title, hint, list }: { title: string; hint: string; list: Species[] }) => (
    <section className="px-4 pb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <span className="text-[12px] text-ink-soft">{hint}</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">{list.map((s) => <Card key={s.id} s={s} />)}</div>
    </section>
  )
  return (
    <Screen>
      <Header />
      <FilterBar />
      <Section title="🌤️ Jetzt draußen" hint={`${now.length} Arten · September`} list={now} />
      <Section title="🍂 Auch möglich" hint={`${later.length} Arten · seltener im September`} list={later} />
      <BottomBar />
    </Screen>
  )
}
