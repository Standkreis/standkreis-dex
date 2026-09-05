import { describe, expect, it } from 'vitest'
import { capEdges, commonsRejected, foldKind, iucnCode, parseAnAge, pickNames, sciLike, usableTargetName } from '../../../etl/prune'

// Record 0002 E6 E7 E8 E9 on the cases the probe found (findings 0005).
describe('names (E6)', () => {
  it('German from the dewiki title, English from the enwiki title, Latin labels are no names', () => {
    expect(pickNames({ sciName: 'Turdus merula', deLabel: 'Turdus merula', enLabel: 'Turdus merula', dewiki: 'https://de.wikipedia.org/wiki/Amsel', enwiki: 'https://en.wikipedia.org/wiki/Common_blackbird' })).toEqual({ de: 'Amsel', en: 'Common blackbird' })
    expect(pickNames({ sciName: 'Amara aenea', deLabel: 'Amara aenea', enLabel: 'Amara aenea', dewiki: 'https://de.wikipedia.org/wiki/Amara_aenea' })).toEqual({})
    expect(pickNames({ sciName: 'Falco tinnunculus', dewiki: 'https://de.wikipedia.org/wiki/Turmfalke_(Vogel)', enLabel: 'common kestrel', jaLabel: 'チョウゲンボウ' })).toEqual({ de: 'Turmfalke', en: 'common kestrel', ja: 'チョウゲンボウ' })
  })
  it('knows a Latin name when it sees one', () => {
    expect(sciLike('Pieris rapae', 'Pieris rapae')).toBe(true)
    expect(sciLike('Pieris rapae rapae', 'Pieris rapae')).toBe(true)
    expect(sciLike('Kohlweißling', 'Pieris rapae')).toBe(false)
    expect(sciLike('Common blackbird', 'Turdus merula')).toBe(false)
  })
  it('maps IUCN labels to codes', () => {
    expect(iucnCode('least concern')).toBe('LC')
    expect(iucnCode(undefined)).toBeNull()
  })
})

describe('image ladder (E7)', () => {
  it('rejects the known specimen and plate leads', () => {
    for (const f of ['Pieris.rapae.mounted.jpg', 'Illustration Cichorium intybus0 clean.jpg', 'Illustration Allium ursinum1.jpg', 'Lamium album Sturm39.jpg', 'Artemisia vulgaris - Köhler–s Medizinal-Pflanzen-016.jpg', '2020 year. Herbarium. Acer platanoides. img-012.jpg', 'Britishentomologyvolume4Plate238.jpg', 'Caterpillars cossus cossus.jpg'])
      expect(commonsRejected(f, ''), f).toBe(true)
    expect(commonsRejected('Turdus merula.jpg', 'Category:Distribution maps of birds')).toBe(true)
  })
  it('keeps live organisms even when the probe regex flinched', () => {
    for (const f of ['Common Buzzard by caroline legg (cropped).jpg', 'Mute Swan Emsworth2.JPG', 'Erinaceus europaeus (Linnaeus, 1758).jpg']) expect(commonsRejected(f, ''), f).toBe(false)
  })
})

describe('GloBI (E9)', () => {
  it('folds preysOn into eats, drops the generic kinds', () => {
    expect(foldKind('preysOn')).toBe('eats')
    expect(foldKind('preyedUponBy')).toBe('eatenBy')
    expect(foldKind('interactsWith')).toBeNull()
    expect(foldKind('adjacentTo')).toBeNull()
  })
  it('caps at 200 unique pairs with in-set targets first', () => {
    const edges = Array.from({ length: 600 }, (_, i) => ({ kind: 'eats' as const, target: `Genus sp${i % 300}` }))
    const kept = capEdges(edges, (t) => t === 'Genus sp299' || t === 'Genus sp250')
    expect(kept).toHaveLength(200)
    expect(kept.slice(0, 2).map((e) => e.target)).toEqual(['Genus sp250', 'Genus sp299'])
    expect(new Set(kept.map((e) => e.target)).size).toBe(200)
  })
  it('only resolves Latin target names', () => {
    expect(usableTargetName('Lumbricus terrestris', 'Turdus merula')).toBe(true)
    expect(usableTargetName('Poaceae', 'Agriphila tristella')).toBe(true)
    expect(usableTargetName('detritus', 'Turdus merula')).toBe(false)
    expect(usableTargetName('Turdus merula', 'Turdus merula')).toBe(false)
  })
})

describe('AnAge (E8)', () => {
  it('reads longevity and clutch size from the entry page', () => {
    const html = '<td>Maximum longevity</td><td>21.8 years (wild)</td> ... Clutch size (oviparous) 4.5 ... Clutches per year 2 ... Female sexual maturity 365 days'
    expect(parseAnAge(html)).toEqual({ lifespan: '21.8 years (wild)', reproduction: 'clutch size 4.5 · 2 clutches per year · mature at 365 days' })
    expect(parseAnAge('<p>nothing</p>')).toEqual({})
  })
})
