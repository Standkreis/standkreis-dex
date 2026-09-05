'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useOffline } from './OfflineBanner'

const Z = 8
const OSM = (x: number, y: number) => `https://tile.openstreetmap.org/${Z}/${x}/${y}.png`
// GBIF's occurrence density tiles since 2016, binned to squares. `squareSize` is not pixels: 64 → 9 px, 256 → 33 px on the
// 512 px tile, 512 and above → an empty tile (probed 2026-09-05). 256 at zoom 8 is ≈ 6 km at 50° N, ≈ 8 km at 35° N: the
// coarsest cell GBIF draws that still keeps the county in view. The 10 km cell of spec §⚖️ is the user's own sighting (M6).
const SQUARE = 256, SQUARE_PX = 33, TILE_PX = 512
const GBIF = (x: number, y: number, taxonKey: number) =>
  `https://api.gbif.org/v2/map/occurrence/density/${Z}/${x}/${y}@1x.png?srs=EPSG%3A3857&taxonKey=${taxonKey}&bin=square&squareSize=${SQUARE}&style=green.poly&year=2016%2C2026`
/** Cell edge in km at this latitude, rounded to whole km. */
const cellKm = (lat: number) => Math.round(((40075 * Math.cos((lat * Math.PI) / 180)) / 2 ** Z / TILE_PX) * SQUARE_PX)

/** Web-Mercator tile coordinates (fractional) of a point. */
const tileXY = (lat: number, lng: number) => {
  const n = 2 ** Z
  const r = (lat * Math.PI) / 180
  return { x: ((lng + 180) / 360) * n, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n }
}

/**
 * The species map of spec §🎨 3 without a map library (M14 owns interaction): nine OSM raster tiles around the region
 * centre, GBIF's density tiles for this species drawn on top, both as plain <img>. A 3 × 3 tile square (half a tile per
 * card width) is shifted so the centre point lands mid-card; the card crops the rest.
 */
export function SpeciesMap({ centre, taxonKey, region }: { centre: { lat: number; lng: number }; taxonKey: number; region: string }) {
  const t = useTranslations('species.occurrence')
  const to = useTranslations('offline')
  // Offline (handoff 0009 Track A): tiles are never cached, so a tile that fails to load turns the card into one honest line.
  const offline = useOffline()
  const [failed, setFailed] = useState(false)
  const waits = offline || failed
  const { x, y } = tileXY(centre.lat, centre.lng)
  const x0 = Math.floor(x) - 1, y0 = Math.floor(y) - 1
  const fx = x - x0, fy = y - y0 // the centre in tile units within the 3 × 3 square, each in [1, 2): never nearer than a tile to an edge
  const tiles = Array.from({ length: 9 }, (_, i) => [x0 + (i % 3), y0 + Math.floor(i / 3)] as const)
  // The square is 3 tiles = 150 % of the card width (150cqw); shift so (fx, fy) sits at (50 %, H/2).
  const style = { left: `calc(50% - ${fx * 50}cqw)`, top: `calc(var(--map-h) / 2 - ${fy * 50}cqw)`, width: '150%', paddingBottom: '150%' } as const
  return (
    <figure className="relative mt-3 overflow-hidden rounded-3xl bg-tile shadow-[0_2px_12px_rgba(30,42,35,0.06)]" style={{ height: 'var(--map-h)', containerType: 'inline-size', ['--map-h' as string]: '200px' }} data-testid="map">
      <div className="absolute" style={style} role="img" aria-label={t('mapAlt', { region })}>
        {tiles.map(([tx, ty], i) => (
          <span key={i} className="absolute h-1/3 w-1/3" style={{ left: `${(i % 3) * 33.3333}%`, top: `${Math.floor(i / 3) * 33.3333}%` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser */}
            <img src={OSM(tx, ty)} alt="" className="absolute inset-0 h-full w-full" draggable={false} onError={() => setFailed(true)} />
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser */}
            <img src={GBIF(tx, ty, taxonKey)} alt="" className="absolute inset-0 h-full w-full opacity-55" draggable={false} />
          </span>
        ))}
      </div>
      {waits && <p className="absolute inset-0 flex items-center justify-center text-[15px] font-semibold text-ink-soft" data-testid="map-waits"><span aria-hidden>📴 </span>{to('mapWaits')}</p>}
      <figcaption className="absolute top-3 left-3 rounded-full bg-card/90 px-3 py-1 text-[13px] font-semibold text-ink shadow-sm backdrop-blur">{t('mapLabel', { km: cellKm(centre.lat) })}</figcaption>
      <span className="absolute bottom-1.5 left-3 text-[10px] text-ink-soft [text-shadow:0_0_3px_#fff]">{t('mapCredit')}</span>
    </figure>
  )
}
