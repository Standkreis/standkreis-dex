import { describe, expect, it } from 'vitest'
import { cutTile, isNow, monthShares, nowRatio, tileOf, words } from '../../../etl/rules'

// Record 0002 E2 E3 E5 E12 on the fixture rows of findings 0005 (shares in per mille × 100).
const totals = [15706, 11261, 20094, 24036, 40416, 32286, 23182, 20077, 15553, 16101, 9557, 9471]
const turmfalke = monthShares([253, 169, 233, 346, 505, 379, 277, 288, 320, 278, 142, 135], totals)

describe('tiles', () => {
  it('follow class, then phylum, then kingdom', () => {
    expect(tileOf({ kingdom: 'Animalia', phylum: 'Chordata', class: 'Aves' })).toBe('bird')
    expect(tileOf({ kingdom: 'Animalia', phylum: 'Chordata', class: 'Squamata' })).toBe('reptile')
    expect(tileOf({ kingdom: 'Animalia', phylum: 'Chordata' })).toBe('fish')
    expect(tileOf({ kingdom: 'Animalia', phylum: 'Arthropoda', class: 'Arachnida' })).toBe('insect')
    expect(tileOf({ kingdom: 'Fungi' })).toBe('fungus')
    expect(tileOf({ kingdom: 'Bacteria' })).toBeNull()
  })
})

describe('cut', () => {
  it('keeps the species making up 90 % of the tile, floor 10', () => {
    const kept = cutTile([{ obs: 50 }, { obs: 30 }, { obs: 10 }, { obs: 9 }, { obs: 9 }])
    expect(kept.map((k) => k.obs)).toEqual([50, 30, 10])
  })
})

describe('words', () => {
  it('Turmfalke is "Ganzes Jahr"', () => expect(words(turmfalke)).toBe('Ganzes Jahr'))
  it('Hausrotschwanz is "Mär–Okt"', () => expect(words([380, 40, 1210, 1930, 1460, 1190, 1140, 870, 1930, 1410, 320, 120])).toBe('Mär–Okt'))
  it('runs wrap over the year end', () => expect(words([100, 100, 0, 0, 0, 0, 0, 0, 0, 100, 100, 100])).toBe('Okt–Feb'))
  it('two runs join with a middle dot', () => expect(words([0, 100, 0, 0, 0, 0, 0, 0, 0, 60, 70, 30])).toBe('Feb · Okt–Dez'))
  it('no observations at all gives no words', () => expect(words(Array(12).fill(0))).toBe(''))
})

describe('now', () => {
  it('ratio and chip for September', () => {
    const peak = Math.max(...turmfalke)
    expect(nowRatio(turmfalke, peak, 9)).toBe(1)
    expect(isNow(turmfalke, peak, 9)).toBe(true)
    expect(isNow([0, 0, 0, 130, 820, 870, 750, 130, 20, 0, 0, 0], 870, 9)).toBe(false)
  })
})
