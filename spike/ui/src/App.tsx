import { useEffect, useState, type ComponentType } from 'react'
import GridA from './screens/GridA'
import GridB from './screens/GridB'
import GridC from './screens/GridC'
import SpeciesP1 from './screens/SpeciesP1'
import SpeciesP2 from './screens/SpeciesP2'
import SpeciesP3 from './screens/SpeciesP3'
import { byId } from './data'
import { FillCard, FillGrid, FillSheet } from './screens/Fill'
import { LogChooser, LogSearch, LogSave } from './screens/Log'
import { OnboardGroups, OnboardReady, OnboardRegion } from './screens/Onboarding'
import { Quests } from './screens/Quests'
import { Journal } from './screens/Journal'
import { You } from './screens/You'
import { Settings } from './screens/Settings'

const routes: Record<string, ComponentType> = {
  '/grid/a': GridA,
  '/grid/b': GridB,
  '/grid/c': GridC,
  '/log/chooser': LogChooser,
  '/log/search': () => <LogSearch q={new URLSearchParams(location.hash.split('?')[1] ?? '').get('q') ?? ''} />,
  '/onboard/region': () => <OnboardRegion variant={location.hash.includes('v=search') ? 'search' : 'location'} />,
  '/onboard/groups': OnboardGroups,
  '/onboard/ready': OnboardReady,
  '/quests': Quests,
  '/journal': Journal,
  '/you': You,
  '/settings': Settings,
}

const useHash = () => {
  const [h, setH] = useState(() => location.hash.slice(1).split('?')[0] || '/grid/a')
  useEffect(() => {
    const on = () => setH(location.hash.slice(1).split('?')[0] || '/grid/a')
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return h
}

export default function App() {
  const hash = useHash()
  const sp = hash.match(/^\/species\/(p[123])\/([a-z-]+)$/)
  if (sp && byId.has(sp[2])) {
    const s = byId.get(sp[2])!
    const P = { p1: SpeciesP1, p2: SpeciesP2, p3: SpeciesP3 }[sp[1] as 'p1' | 'p2' | 'p3']!
    return <P s={s} />
  }
  const fl = hash.match(/^\/fill\/(grid|card|sheet)\/([a-z-]+)$/)
  if (fl && byId.has(fl[2])) {
    const s = byId.get(fl[2])!
    const F = { grid: FillGrid, card: FillCard, sheet: FillSheet }[fl[1] as 'grid' | 'card' | 'sheet']!
    return <F s={s} />
  }
  const sv = hash.match(/^\/log\/save\/([a-z-]+)$/)
  if (sv && byId.has(sv[1])) return <LogSave s={byId.get(sv[1])!} photo={location.hash.includes('photo')} />
  const View = routes[hash]
  if (!View) {
    return (
      <div className="p-6 text-sm">
        <p className="mb-3 font-semibold">UI spike · screens</p>
        <ul className="space-y-1">{[...new Set([...Object.keys(routes), '/species/p1/turdus-merula', '/species/p2/turdus-merula', '/species/p3/turdus-merula', '/species/p1/salamandra-salamandra', '/species/p1/amanita-muscaria', '/species/p2/rubus-fruticosus', '/fill/grid/garrulus-glandarius', '/fill/card/garrulus-glandarius', '/fill/sheet/garrulus-glandarius', '/log/chooser', '/log/search', '/log/search?q=ei', '/log/save/garrulus-glandarius', '/onboard/region', '/onboard/region?v=search', '/onboard/groups', '/onboard/ready', '/grid/a?drawer', '/quests', '/quests?v=walk', '/journal', '/journal?v=diary', '/you', '/you?v=plain', '/you?xpinfo', '/settings', '/settings?synced'])].map((r) => <li key={r}><a className="text-moss underline" href={`#${r}`}>{r}</a></li>)}</ul>
      </div>
    )
  }
  return <View />
}
