import { describe, expect, it } from 'vitest'
import { fold, search } from './AtlasSearch'

// C5 (handoff 0007): Amsel first for "amsel", "turdus", "blackbird"; the damselflies (…amsel…) stay out.
const set = [
  { names: { de: 'Große Pechlibelle', en: 'Blue-tailed damselfly' }, sciName: 'Ischnura elegans' },
  { names: { de: 'Wacholderdrossel', en: 'Fieldfare' }, sciName: 'Turdus pilaris' },
  { names: { de: 'Amsel', en: 'Common blackbird' }, sciName: 'Turdus merula' },
  { names: { de: 'Singdrossel', en: 'Song thrush' }, sciName: 'Turdus philomelos' },
  { names: { de: 'Rotkehlchen', en: 'European robin' }, sciName: 'Erithacus rubecula' },
]
const de = (s: (typeof set)[number]) => s.names.de
const en = (s: (typeof set)[number]) => s.names.en

describe('fold', () => {
  it('drops case, diacritics and ß', () => expect(fold('Große Ähre')).toBe('grosse ahre'))
})

describe('search', () => {
  it('"amsel" is Amsel alone, not the damselflies', () => expect(search(set, 'amsel', de).map(de)).toEqual(['Amsel']))
  it('"turdus" is every Turdus, in the incoming order', () => expect(search(set, 'turdus', de).map(de)).toEqual(['Wacholderdrossel', 'Amsel', 'Singdrossel']))
  it('"blackbird" in en is Amsel by its second word', () => expect(search(set, 'blackbird', en).map(de)).toEqual(['Amsel']))
  it('the shown name ranks before a word match', () => expect(search(set, 'rot', de).map(de)).toEqual(['Rotkehlchen']))
  it('"gross" matches Große', () => expect(search(set, 'gross', de).map(de)).toEqual(['Große Pechlibelle']))
  it('nothing matches gives an empty list', () => expect(search(set, 'xyz', de)).toEqual([]))
  it('empty query keeps everything', () => expect(search(set, '  ', de)).toHaveLength(5))
})
