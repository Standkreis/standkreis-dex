import { species } from '../data'
import { GROUPS, MONTH, stateOf, type Species } from '../types'
import { Silhouette } from '../components/Silhouette'
import { SeenMark, StudiedMark } from '../components/Marks'
import { useEffect, useState } from 'react'
import { Header, SearchFilterBar, FilterDrawer, FilterFab, BottomBar, Screen, useScrolledPast } from '../components/Shell'

// A · Flat grid · 3 columns · photo fills the whole tile · bookmark badge · sorted by "likely now"
const order = [...species].sort((a, b) => b.months[MONTH] - a.months[MONTH] || GROUPS.findIndex((g) => g.id === a.group) - GROUPS.findIndex((g) => g.id === b.group) || a.names.de.localeCompare(b.names.de))

// Revision 3 (owner pick, 2026-09-04): the reference image in greyscale at reduced opacity replaces the group silhouettes.
// The gap was never "what is it" (the name is under every cell), it is "have I found it"; grey to colour is the reveal.

function Cell({ s, filling = false }: { s: Species; filling?: boolean }) {
  const st = stateOf(s)
  const photo = s.state.userPhoto ?? s.image
  if (!filling && (st === 'silhouette' || st === 'studied') && s.image) {
    return (
      <a href={`#/species/p1/${s.id}`} className="flex flex-col text-left" onClick={() => sessionStorage.setItem('grid-scroll', String(scrollY))}>
        <div className={`relative aspect-square w-full overflow-hidden rounded-2xl bg-tile ${st === 'studied' ? 'ring-2 ring-amber ring-inset' : ''}`}>
          <img src={s.image!.url} alt="" loading="lazy" className={`h-full w-full object-cover grayscale ${st === 'studied' ? 'opacity-70' : 'opacity-45'}`} />
          {st === 'studied' && <StudiedMark className="absolute top-1.5 left-1.5" />}
        </div>
        <span className={`mt-1 truncate px-0.5 text-[13px] leading-tight ${st === 'silhouette' ? 'text-ink-soft' : 'font-medium'}`}>{s.names.de}</span>
      </a>
    )
  }
  return (
    <a href={`#/species/p1/${s.id}`} className={`flex flex-col text-left ${filling ? 'relative z-10' : ''}`} onClick={() => sessionStorage.setItem('grid-scroll', String(scrollY))}>
      <div className={`relative aspect-square w-full overflow-hidden rounded-2xl bg-tile ${filling ? 'ring-4 ring-moss' : ''}`}>
        {(st === 'silhouette' || st === 'studied') && <Silhouette group={s.group} mode="fill" className="h-full w-full p-3 text-ink/55" />}
        {(st === 'seen' || st === 'both') && photo && (
          <>
            <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-1.5 pt-3 pb-0.5 text-[8px] leading-tight text-white/85">
              {s.state.userPhoto ? 'dein Foto' : `${photo.author.split(/[,(]/)[0].trim()} · ${photo.license}`}
            </span>
          </>
        )}
        {filling && photo && <img src={photo.url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        {(st === 'studied' || st === 'both') && <StudiedMark className="absolute top-1.5 left-1.5" />}
        {(st === 'seen' || st === 'both') && <SeenMark className="absolute top-1.5 right-1.5" />}
      </div>
      <span className={`mt-1 truncate px-0.5 text-[13px] leading-tight ${st === 'silhouette' ? 'text-ink-soft' : 'font-medium'}`}>{s.names.de}</span>
    </a>
  )
}

export default function GridA({ fill, hideBar = false }: { fill?: string; hideBar?: boolean }) {
  const [drawer, setDrawer] = useState<false | 'filter' | 'search'>(location.hash.includes('drawer') ? 'search' : false)
  const { ref: barRef, past } = useScrolledPast<HTMLDivElement>()
  useEffect(() => { const y = sessionStorage.getItem('grid-scroll'); if (y) requestAnimationFrame(() => scrollTo(0, Number(y))) }, [])
  return (
    <Screen>
      <Header bump={!!fill} />
      <div ref={barRef}><SearchFilterBar count={3} onFilter={() => setDrawer('filter')} /></div>
      <FilterFab count={3} visible={(past || location.hash.includes('fab')) && !hideBar} onClick={() => setDrawer('search')} />
      {drawer && <FilterDrawer withSearch={drawer === 'search'} onClose={() => setDrawer(false)} />}
      <div className="grid grid-cols-3 gap-x-3 gap-y-3 px-4">
        {order.map((s) => <Cell key={s.id} s={s} filling={s.id === fill} />)}
      </div>
      <p className="px-4 pt-4 text-[11px] text-ink-faint">Graue Bilder: Wikimedia Commons und iNaturalist, Lizenz und Autor auf jeder Artseite. Farbig wird, was du findest.</p>
      {!hideBar && <BottomBar />}
    </Screen>
  )
}
