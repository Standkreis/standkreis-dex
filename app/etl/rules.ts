// The pure rules of record 0002: tiles from ranks (E5, E12), the per-tile cut (E2), month shares and words (E3).
// No I/O here; the ETL and the read routers share this file.
import type { Tile } from '../src/generated/prisma/enums'

export const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const
export const REPTILE_ORDERS = ['Squamata', 'Testudines', 'Crocodylia']
export const TILES: readonly Tile[] = ['bird', 'mammal', 'amphibian', 'reptile', 'fish', 'insect', 'plant', 'fungus']

type Ranks = { kingdom?: string; phylum?: string; class?: string }

/**
 * Tile from GBIF ranks, in this order: Aves · Mammalia · Amphibia · Squamata + Testudines + Crocodylia (GBIF files them as
 * classes) · other Chordata = 🐟 · other Animalia = 🦋 Insekten & Spinnen · Plantae · Fungi. Anything else (Bacteria,
 * Chromista, Protozoa, incertae sedis) gets no tile and is not in the set.
 */
export function tileOf(s: Ranks): Tile | null {
  if (s.class === 'Aves') return 'bird'
  if (s.class === 'Mammalia') return 'mammal'
  if (s.class === 'Amphibia') return 'amphibian'
  if (s.class && REPTILE_ORDERS.includes(s.class)) return 'reptile'
  if (s.phylum === 'Chordata') return 'fish'
  if (s.kingdom === 'Animalia') return 'insect'
  if (s.kingdom === 'Plantae') return 'plant'
  if (s.kingdom === 'Fungi') return 'fungus'
  return null
}

export const CUT_SHARE = 0.9
export const CUT_FLOOR = 10

/**
 * The E2 cut for one tile: species sorted by observations, kept until the kept ones make up 90 % of the tile's
 * observations; species under the floor never count, neither in the effort nor in the set (matrix.mjs).
 */
export function cutTile<T extends { obs: number }>(candidates: T[], share = CUT_SHARE, floor = CUT_FLOOR): T[] {
  const eligible = candidates.filter((c) => c.obs >= floor).sort((a, b) => b.obs - a.obs)
  const effort = eligible.reduce((a, c) => a + c.obs, 0)
  const kept: T[] = []
  let acc = 0
  for (const c of eligible) {
    if (acc >= effort * share) break
    acc += c.obs
    kept.push(c)
  }
  return kept
}

/**
 * Shares are stored as integers per 100,000 = per mille with two decimals, the fixture's `sharePerMille` × 100.
 * Plain per mille rounds every species under ~50 records to zero and halves "nur jetzt" (findings 0006).
 */
export const SHARE_SCALE = 100_000
/** Share of the region's observations per month, in SHARE_SCALE; a month with no observations at all gives 0. */
export const monthShares = (byMonth: number[], monthTotals: number[]) =>
  byMonth.map((n, i) => (monthTotals[i] ? Math.round((SHARE_SCALE * n) / monthTotals[i]) : 0))
/** Stored share → per mille, as the spec and the UI speak it. */
export const perMille = (share: number) => share / (SHARE_SCALE / 1000)

export const NOW_RATIO = 0.25
export const YEAR_RATIO = 0.1

/**
 * E3 words on the twelve shares: every month ≥ 10 % of the peak → "Ganzes Jahr"; else the runs of months ≥ 25 % of
 * the peak, wrapping over the year end ("Nov–Feb"). No observations in any month → "".
 */
export function words(shares: number[]): string {
  const peak = Math.max(...shares)
  if (peak <= 0) return ''
  if (Math.min(...shares) >= peak * YEAR_RATIO) return 'Ganzes Jahr'
  const on = shares.map((x) => x >= peak * NOW_RATIO)
  const out: string[] = []
  for (let i = 0; i < 12; i++) {
    if (on[i] && !on[(i + 11) % 12]) {
      let e = i
      while (on[(e + 1) % 12] && e < i + 11) e++
      out.push(e === i ? MONTHS[i] : `${MONTHS[i]}–${MONTHS[e % 12]}`)
    }
  }
  return out.join(' · ')
}

/** This month's share ÷ the species' peak, 0..1. The default sort ("jetzt wahrscheinlich"). */
export const nowRatio = (shares: number[], peak: number, month: number) => (peak > 0 ? shares[month - 1] / peak : 0)
/** The chip "nur jetzt": ≥ 25 % of peak this month. */
export const isNow = (shares: number[], peak: number, month: number) => peak > 0 && shares[month - 1] >= peak * NOW_RATIO
