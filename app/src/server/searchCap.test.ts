import { describe, expect, it } from 'vitest'
import { takeSearchToken } from './searchCap'

describe('search cap (handoff 0009 Track B)', () => {
  it('lets 30 calls a minute through, refuses the 31st, refills with time', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 30; i++) expect(takeSearchToken('a', t0)).toBe(true)
    expect(takeSearchToken('a', t0)).toBe(false)
    expect(takeSearchToken('a', t0 + 1_999)).toBe(false) // not yet one token (2 s each)
    expect(takeSearchToken('a', t0 + 2_100)).toBe(true)
    expect(takeSearchToken('b', t0)).toBe(true) // another identity has its own bucket
  })
})
