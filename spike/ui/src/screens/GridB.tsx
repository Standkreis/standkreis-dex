import { species } from '../data'
import { GROUPS, stateOf, type Species } from '../types'
import { Silhouette, silhouetteMask } from '../components/Silhouette'
import { StudiedMark } from '../components/Marks'
import { Header, FilterBar, BottomBar, Screen } from '../components/Shell'

// B · Grouped by taxon · 4 columns · photo cut into the silhouette shape (Gotcha) · no names in the grid
function Cell({ s }: { s: Species }) {
  const st = stateOf(s)
  const photo = s.state.userPhoto ?? s.image
  const filled = (st === 'seen' || st === 'both') && photo
  return (
    <button className={`relative aspect-square overflow-hidden rounded-xl ${st === 'studied' ? 'bg-amber-soft/60 ring-1 ring-amber/40 ring-inset' : filled ? 'bg-moss-soft' : 'bg-tile'}`} title={s.names.de}>
      {st === 'silhouette' && <Silhouette group={s.group} mode="fill" className="h-full w-full p-2 text-ink/50" />}
      {st === 'studied' && <Silhouette group={s.group} mode="outline" className="h-full w-full p-2 text-amber" bg="#f8f0e3" />}
      {filled && (
        <div className="h-full w-full p-2">
          <div className="h-full w-full" style={{ WebkitMaskImage: silhouetteMask(s.group), maskImage: silhouetteMask(s.group), WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}>
            <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        </div>
      )}
      {(st === 'studied' || st === 'both') && <StudiedMark size={16} className="absolute top-1 right-1" />}
    </button>
  )
}

export default function GridB() {
  return (
    <Screen>
      <Header />
      <FilterBar compact />
      {GROUPS.map((g) => {
        const list = species.filter((s) => s.group === g.id).sort((a, b) => a.names.de.localeCompare(b.names.de))
        if (!list.length) return null
        const seen = list.filter((s) => s.state.seen).length
        const studied = list.filter((s) => s.state.studied).length
        return (
          <section key={g.id} className="px-4 pt-2 pb-3">
            <div className="mb-1.5 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">{g.emoji} {g.de}</h2>
              <span className="text-[12px] text-ink-soft"><span className="text-amber">{studied}</span> · <span className="text-moss">{seen}</span> / {list.length}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {list.map((s) => <Cell key={s.id} s={s} />)}
            </div>
          </section>
        )
      })}
      <BottomBar />
    </Screen>
  )
}
