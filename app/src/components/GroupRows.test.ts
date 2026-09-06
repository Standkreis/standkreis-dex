import { describe, expect, it } from 'vitest'
import { groupsOf } from './GroupRows'

// Handoff 0014 P3: one row per tile of the set, counts over the group's size; an id seen twice counts once; an out-of-set
// find (E13) counts nowhere; a tile the set does not list gets no row.
describe('groupsOf', () => {
  const set = {
    tiles: [{ tile: 'bird' }, { tile: 'insect' }],
    species: [
      { taxonId: 'a', tile: 'bird' },
      { taxonId: 'b', tile: 'bird' },
      { taxonId: 'c', tile: 'insect' },
      { taxonId: 'd', tile: 'fish' },
    ],
  }
  it('is null until both reads are in', () => {
    expect(groupsOf(null, { studied: [], seen: [] })).toBeNull()
    expect(groupsOf(set, null)).toBeNull()
  })
  it('counts per tile over the group size', () => {
    expect(groupsOf(set, { studied: ['a', 'c', 'd'], seen: ['a', 'a', 'zzz'] })).toEqual([
      { tile: 'bird', studied: 1, seen: 1, possible: 2 },
      { tile: 'insect', studied: 1, seen: 0, possible: 1 },
    ])
  })
})
