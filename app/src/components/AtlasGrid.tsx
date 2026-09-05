'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { Tile } from '@/generated/prisma/enums'
import { useTRPC } from '@/trpc/client'

const allTiles = Object.values(Tile) as Tile[]

// M5 preview slice, not the milestone: the real set as the 3-column silhouette grid of spec §🎨 2.
// Not yet discovered = reference image in greyscale at 45 %, German name under each, one sources line, "nur jetzt" chip.
// No filter drawer, no species page, no studied/seen join yet.
export function AtlasGrid({ title }: { title: string }) {
  const t = useTranslations('dex')
  const tc = useTranslations('common')
  const locale = useLocale()
  const trpc = useTRPC()
  const [nowOnly, setNowOnly] = useState(false)
  const me = useQuery(trpc.identity.me.queryOptions())
  const region = me.data?.region ?? null
  const ready = region?.status === 'ready'
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region?.id ?? '', tiles: allTiles, nowOnly }, { enabled: ready }))
  const progress = useQuery(trpc.identity.progress.queryOptions(undefined, { enabled: ready }))
  const studied = new Set(progress.data?.studied ?? [])
  const seen = new Set(progress.data?.seen ?? [])

  const name = (s: { names: Record<string, string>; sciName: string }) => s.names[locale] ?? s.names.de ?? s.names.en ?? s.sciName

  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-24">
      <div className="flex h-10 items-center justify-between">
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{title}</h1>
        {ready && (
          <button type="button" onClick={() => setNowOnly((v) => !v)} aria-pressed={nowOnly}
            className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${nowOnly ? 'bg-moss text-white' : 'bg-tile text-ink-soft'}`}>
            {t('nowOnly')}
          </button>
        )}
      </div>
      {!region && <p className="mt-3 text-[15px] text-ink-soft">{t('noRegion')}</p>}
      {region && !ready && <p className="mt-3 text-[15px] text-ink-soft">{region.name} · {t('preparing')}</p>}
      {set.data && (
        <>
          <p className="mt-2 text-[15px]" data-testid="counters">
            <span className="font-bold text-amber">{t('studied', { n: set.data.species.filter((s) => studied.has(s.taxonId)).length })}</span>
            <span className="text-ink-soft"> · </span>
            <span className="font-bold text-moss-deep">{t('seen', { n: set.data.species.filter((s) => seen.has(s.taxonId)).length })}</span>
            <span className="text-ink-soft"> · {t('possible', { n: set.data.setSize })}{nowOnly ? ` · ${t('shown', { n: set.data.species.length })}` : ''}</span>
          </p>
          <ul className="mt-4 grid grid-cols-3 gap-2" data-testid="grid">
            {set.data.species.map((s) => {
              const isSeen = seen.has(s.taxonId), isStudied = studied.has(s.taxonId)
              return (
                <li key={s.taxonId} className="min-w-0">
                  <div className={`relative aspect-square overflow-hidden rounded-2xl bg-tile ${isStudied && !isSeen ? 'ring-2 ring-amber ring-inset' : ''}`}>
                    {s.lead ? (
                      // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts, no optimiser
                      <img src={s.lead.url} alt="" loading="lazy" className={`h-full w-full object-cover ${isSeen ? '' : isStudied ? 'opacity-70 grayscale' : 'opacity-45 grayscale'}`} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[28px] opacity-40" aria-hidden>{tileIcon[s.tile]}</div>
                    )}
                    {isSeen && <span className="absolute right-1.5 bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-moss text-[12px] font-bold text-white">✓</span>}
                    {isStudied && <span className="absolute bottom-1.5 left-1.5 text-[12px]" aria-label={t('studiedBadge')}>📖</span>}
                  </div>
                  <div className="mt-1 truncate text-[12px] leading-tight">{name(s)}</div>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-[12px] text-ink-faint">{t('sources')}</p>
        </>
      )}
      {set.isLoading && ready && <p className="mt-3 text-[15px] text-ink-soft">{tc('working')}</p>}
    </main>
  )
}

const tileIcon: Record<Tile, string> = { bird: '🐦', mammal: '🦌', amphibian: '🐸', reptile: '🦎', fish: '🐟', insect: '🦋', plant: '🌿', fungus: '🍄' }
