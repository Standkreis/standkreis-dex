import { TRPCError } from '@trpc/server'
import { describe, expect, it, vi } from 'vitest'
import { cost, firstBinomial, instructions, join, listBlock, parseAnswer, THRESHOLD } from './identify'
import { localeOf } from './locale'

// Handoff 0016 Track A: the JSON validation, the join and the threshold on answers recorded by the grill
// (`scripts/id-probe/.cache/claude-claude-sonnet-5-set-<n>.json`, findings 0015 §🪜), carried over to the shipped
// shape (`subject` in front, `hint` for `hint_de`). No network: the backbone search is a stub.

const set = new Map(
  [
    { gbifKey: 3020791, sciName: 'Prunus avium', de: 'Vogelkirsche' },
    { gbifKey: 5285637, sciName: 'Pinus sylvestris', de: 'Waldkiefer' },
    { gbifKey: 6258028, sciName: 'Mantis religiosa', de: 'Europäische Gottesanbeterin' },
    { gbifKey: 5362573, sciName: 'Pyrus communis', de: 'Kultur-Birne' },
    { gbifKey: 3001244, sciName: 'Malus domestica', de: 'Kulturapfel' },
  ].map((r) => [r.sciName, r]),
)
const backbone: Record<string, { gbifKey: number; sciName: string }[]> = {
  'Ficus microcarpa': [{ gbifKey: 5361859, sciName: 'Ficus microcarpa' }, { gbifKey: 2984573, sciName: 'Ficus benjamina' }],
  'Schefflera arboricola': [{ gbifKey: 3034584, sciName: 'Schefflera arboricola' }],
}
const search = vi.fn(async (q: string) => backbone[q] ?? [])

// 15 · the cherry (findings 0015 §🪜), recorded 2026-09-06, 0.75
const cherry = `{"subject": "single", "answer": "Prunus avium", "name": "Vogelkirsche", "ladder": {"family": "Rosaceae", "genus": "Prunus", "species": "Prunus avium"}, "evidence": ["young tree with elliptic serrated leaves typical of cherry", "small round bright red cherries hanging in clusters on short pedicels"], "context": "planted/staked young fruit tree in an orchard row, tree guard visible", "confidence": 0.75, "candidates": ["Prunus avium"], "if_outside": null, "hint": "Ein Foto der Rinde und der Blütenreste am Zweig würde helfen, die Sorte zu bestätigen."}`
// 13 · the forest scene forced onto one conifer, 0.55
const scene = `{"subject": "single", "answer": "Pinus sylvestris", "name": "Waldkiefer", "ladder": {"family": "Pinaceae", "genus": "Pinus", "species": "Pinus sylvestris"}, "evidence": ["reddish-orange scaly bark typical of pine"], "context": "forest hiking trail", "confidence": 0.55, "candidates": ["Pinus sylvestris"], "if_outside": null, "hint": "Fotografiere die Nadeln und Zapfen aus der Nähe."}`
// 9 · the bonsai, outside the set, 0.9, the guess in prose
const bonsai = `{"subject": "single", "answer": "outside the set", "name": null, "ladder": {"family": "Moraceae", "genus": "Ficus", "species": null}, "evidence": ["Bonsai tree in ceramic pot on metal stand"], "context": "Potted bonsai displayed outside a house entrance", "confidence": 0.9, "candidates": [], "if_outside": "Cultivated bonsai, likely Ficus microcarpa or similar ornamental Ficus species, not part of the wild regional species list", "hint": "Bitte eine wildwachsende Pflanze fotografieren."}`
// 4 · the misty tree nobody can name, 0.15
const mist = `{"subject": "single", "answer": "cannot tell", "name": null, "ladder": {"family": null, "genus": null, "species": null}, "evidence": ["Distant, blurry photo of a single tree"], "context": null, "confidence": 0.15, "candidates": ["Populus alba", "Prunus avium"], "if_outside": null, "hint": "Bitte ein scharfes Nahfoto von Blättern, Rinde und Früchten machen."}`
// 7 · Prunus avium at 0.35: right, but below the line
const solitaire = `{"subject": "single", "answer": "Prunus avium", "name": "Vogelkirsche", "ladder": {"family": "Rosaceae", "genus": "Prunus", "species": "Prunus avium"}, "evidence": ["freistehender Solitärbaum auf Weide"], "context": "Weidezaun", "confidence": 0.35, "candidates": ["Prunus avium", "Malus domestica", "Pyrus communis"], "if_outside": null, "hint": "Bitte Blätter, Rinde und Früchte aus der Nähe fotografieren."}`

describe('parseAnswer (A2)', () => {
  it('reads the recorded shape, with or without a fence', () => {
    expect(parseAnswer(cherry).answer).toBe('Prunus avium')
    expect(parseAnswer('```json\n' + cherry + '\n```').confidence).toBe(0.75)
  })
  it('a malformed answer is a typed 422, never a 500', () => {
    for (const bad of ['The photo shows a cherry tree.', '{"answer": "Prunus avium"}', cherry.replace('0.75', '1.5'), cherry.replace('"single"', '"maybe"'), '']) {
      let err: unknown
      try { parseAnswer(bad) } catch (e) { err = e }
      expect(err).toBeInstanceOf(TRPCError)
      expect((err as TRPCError).code).toBe('UNPROCESSABLE_CONTENT')
    }
  })
})

describe('join (A3) and the threshold (A4)', () => {
  it('a set member at or above the line is the answer, with its key', async () => {
    const r = await join(parseAnswer(cherry), set, search)
    expect(r).toMatchObject({ subject: 'single', answer: { gbifKey: 3020791, sciName: 'Prunus avium' }, outside: null, confidence: 0.75, ladder: { family: 'Rosaceae', genus: 'Prunus', species: 'Prunus avium' } })
    expect(r.evidence).toHaveLength(2)
    expect(r.hint).toMatch(/Rinde/)
    expect(search).not.toHaveBeenCalled()
  })
  it('below the line the answer is null and the ladder stops at the genus', async () => {
    expect(THRESHOLD).toBe(0.7)
    for (const text of [scene, solitaire]) {
      const r = await join(parseAnswer(text), set, search)
      expect(r.answer).toBeNull()
      expect(r.ladder.species).toBeNull()
      expect(r.ladder.genus).toBeTruthy()
    }
    expect((await join(parseAnswer(cherry.replace('0.75', '0.69')), set, search)).answer).toBeNull()
    expect((await join(parseAnswer(cherry.replace('0.75', '0.7')), set, search)).answer).not.toBeNull()
  })
  it('"cannot tell" is null everywhere; the hint stays', async () => {
    const r = await join(parseAnswer(mist), set, search)
    expect(r).toMatchObject({ subject: 'single', answer: null, outside: null, ladder: { family: null, genus: null, species: null } })
    expect(r.hint).toMatch(/Nahfoto/)
  })
  it('outside the set: the binomial from the prose, a key from the backbone search, nothing created', async () => {
    search.mockClear()
    const r = await join(parseAnswer(bonsai), set, search)
    expect(search).toHaveBeenCalledWith('Ficus microcarpa')
    expect(r).toMatchObject({ subject: 'single', answer: { gbifKey: 5361859, sciName: 'Ficus microcarpa' }, outside: 'Ficus microcarpa', ladder: { family: 'Moraceae', genus: 'Ficus', species: 'Ficus microcarpa' } })
  })
  it('outside the set below the line: the name, no key, no search', async () => {
    search.mockClear()
    const r = await join(parseAnswer(bonsai.replace('0.9', '0.5')), set, search)
    expect(search).not.toHaveBeenCalled()
    expect(r).toMatchObject({ answer: null, outside: 'Ficus microcarpa', ladder: { genus: 'Ficus', species: null } })
  })
  it('a name the list does not have is an outside name; the search may know it, or not', async () => {
    const r1 = await join(parseAnswer(cherry.replace(/Prunus avium/g, 'Schefflera arboricola')), set, search)
    expect(r1).toMatchObject({ answer: { gbifKey: 3034584 }, outside: 'Schefflera arboricola' })
    const r2 = await join(parseAnswer(cherry.replace(/Prunus avium/g, 'Prunus imaginaria')), set, search)
    expect(r2).toMatchObject({ answer: null, outside: 'Prunus imaginaria' })
  })
  it('"outside the set" naming a list member is that member (fixture row 8); prose in a rung is null (row 4)', async () => {
    const row8 = bonsai.replace('"genus": "Ficus"', '"genus": "Malus"').replace('"family": "Moraceae"', '"family": "Rosaceae"').replace(/"if_outside": "[^"]*"/, '"if_outside": "Malus domestica (Kulturapfel), an orchard tree"')
    expect(await join(parseAnswer(row8), set, search)).toMatchObject({ answer: { gbifKey: 3001244, sciName: 'Malus domestica' }, outside: null, ladder: { genus: 'Malus', species: 'Malus domestica' } })
    expect(await join(parseAnswer(row8.replace('0.9', '0.6')), set, search)).toMatchObject({ answer: null, outside: null, ladder: { genus: 'Malus', species: null } })
    const row4 = mist.replace('"family": null', '"family": "Baum (unbestimmte Familie)"').replace('"genus": null', '"genus": "Laubbaum, Gattung unklar"')
    expect((await join(parseAnswer(row4), set, search)).ladder).toEqual({ family: null, genus: null, species: null })
  })
  it('several and none never carry an answer; "several" as the answer sets the subject', async () => {
    const several = await join(parseAnswer(cherry.replace('"single"', '"several"')), set, search)
    expect(several).toMatchObject({ subject: 'several', answer: null, outside: null })
    const said = await join(parseAnswer(mist.replace('"cannot tell"', '"several"')), set, search)
    expect(said.subject).toBe('several')
    const none = await join(parseAnswer(bonsai.replace('"single"', '"none"')), set, search)
    expect(none).toMatchObject({ subject: 'none', answer: null, outside: 'Ficus microcarpa' })
  })
})

describe('the prompt and the cost line (A5, A6)', () => {
  it('the list block is the same bytes call to call: sorted rows, the cache prefix', () => {
    const region = { id: 'r', name: 'Mainz-Bingen', higher: 'Germany › Rheinland-Pfalz' }
    const rows = [...set.values()].sort((a, b) => a.sciName.localeCompare(b.sciName, 'en'))
    const block = listBlock(region, rows)
    expect(block).toBe(listBlock(region, [...rows]))
    expect(block).toContain('5 species')
    expect(block).toContain('Prunus avium · Vogelkirsche')
    expect(instructions('de', region)).toMatch(/auf Deutsch/)
    expect(instructions('en', region)).toMatch(/in English/)
    expect(instructions('de', region)).toContain('"subject"')
  })
  it('cents at Sonnet 5 prices: the cherry cost 1.407 ¢ with the list read from the cache', () => {
    expect(cost({ input_tokens: 2526, cache_creation_input_tokens: 0, cache_read_input_tokens: 19334, output_tokens: 515 })).toEqual({ input: 2526, cacheWrite: 0, cached: 19334, output: 515, cents: 1.407 })
    expect(cost(null).cents).toBe(0)
  })
  it('the first binomial of a guess', () => {
    expect(firstBinomial('Cultivated bonsai, likely Ficus microcarpa or similar')).toBe('Ficus microcarpa')
    expect(firstBinomial('Schefflera arboricola or similar (Dwarf Umbrella Tree), a common houseplant')).toBe('Schefflera arboricola')
    expect(firstBinomial('Cultivated pumpkin, Cucurbita maxima or Cucurbita pepo', 'Cucurbita')).toBe('Cucurbita maxima')
    expect(firstBinomial('a pumpkin')).toBeNull()
    expect(firstBinomial(null)).toBeNull()
  })
  it('the locale comes from the header, else the page that asked, else German', () => {
    const req = (h: Record<string, string>) => new Request('http://localhost/api/trpc/x', { headers: h })
    expect(localeOf(req({ 'x-dex-locale': 'en' }))).toBe('en')
    expect(localeOf(req({ referer: 'http://localhost:3006/en/log?photo=1' }))).toBe('en')
    expect(localeOf(req({ referer: 'http://localhost:3006/de' }))).toBe('de')
    expect(localeOf(req({ referer: 'http://localhost:3006/api/photo' }))).toBe('de')
    expect(localeOf(req({}))).toBe('de')
  })
})
