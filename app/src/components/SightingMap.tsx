'use client'

import { useTranslations } from 'next-intl'

const Z = 16
const OSM = (x: number, y: number) => `https://tile.openstreetmap.org/${Z}/${x}/${y}.png`

/** Web-Mercator tile coordinates (fractional) of a point. */
const tileXY = (lat: number, lng: number) => {
  const n = 2 ** Z
  const r = (lat * Math.PI) / 180
  return { x: ((lng + 180) / 360) * n, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n }
}

/**
 * The exact place of one sighting (spec §⚖️ ladder: exact only here), the SpeciesMap approach without a map library:
 * nine OSM tiles at zoom 16 in a 3 × 3 square shifted so the point lands mid-card, one dot on it.
 */
export function SightingMap({ lat, lng }: { lat: number; lng: number }) {
  const t = useTranslations('sighting')
  const { x, y } = tileXY(lat, lng)
  const x0 = Math.floor(x) - 1, y0 = Math.floor(y) - 1
  const fx = x - x0, fy = y - y0
  const tiles = Array.from({ length: 9 }, (_, i) => [x0 + (i % 3), y0 + Math.floor(i / 3)] as const)
  const style = { left: `calc(50% - ${fx * 50}cqw)`, top: `calc(var(--map-h) / 2 - ${fy * 50}cqw)`, width: '150%', paddingBottom: '150%' } as const
  return (
    <figure className="relative mt-3 overflow-hidden rounded-3xl bg-tile shadow-[0_2px_12px_rgba(30,42,35,0.06)]" style={{ height: 'var(--map-h)', containerType: 'inline-size', ['--map-h' as string]: '200px' }} data-testid="map">
      <div className="absolute" style={style} role="img" aria-label={t('mapAlt')}>
        {tiles.map(([tx, ty], i) => (
          // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser
          <img key={i} src={OSM(tx, ty)} alt="" className="absolute h-1/3 w-1/3" style={{ left: `${(i % 3) * 33.3333}%`, top: `${Math.floor(i / 3) * 33.3333}%` }} draggable={false} />
        ))}
      </div>
      <span className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-moss ring-[3px] ring-white shadow-md" aria-hidden />
      <figcaption className="absolute top-3 left-3 rounded-full bg-card/90 px-3 py-1 text-[13px] font-semibold text-ink shadow-sm backdrop-blur">{t('exact')}</figcaption>
      <span className="absolute bottom-1.5 left-3 text-[10px] text-ink-soft [text-shadow:0_0_3px_#fff]">{t('mapCredit')}</span>
    </figure>
  )
}
