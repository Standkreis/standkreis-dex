export type Group = 'bird' | 'mammal' | 'insect' | 'plant' | 'fungus' | 'amphibian' | 'reptile'

export type Attributed = { url: string; author: string; license: string; licenseUrl?: string; page: string }

export type Fact = { text: string; detail?: string; source: string; stub?: boolean }
export type Lookalike = { id?: string | null; name?: string; hint: string }
export type Facts = { size?: Fact; lifespan?: Fact; reproduction?: Fact; habitat?: Fact; migration?: Fact; sound?: Fact; lookalikes?: Lookalike[] }

export type Interaction = { kind: string; target: string; source: string; mirrored?: boolean }

export type Species = {
  id: string
  gbifKey: number | null
  wikidata: string | null
  names: { sci: string; de: string; en: string }
  group: Group
  iucn: string | null
  tags: string[]
  image: Attributed | null
  intro: { text: string; source?: string; license: string } | null
  months: number[]
  interactions: Interaction[]
  facts?: Facts
  state: { studied: boolean; seen: boolean; seenFirst: string | null; userPhoto: Attributed | null }
}

export type DexState = 'silhouette' | 'studied' | 'seen' | 'both'

export const stateOf = (s: Species): DexState =>
  s.state.studied && s.state.seen ? 'both' : s.state.studied ? 'studied' : s.state.seen ? 'seen' : 'silhouette'

export const GROUPS: { id: Group; de: string; one: string; emoji: string }[] = [
  { id: 'bird', de: 'Vögel', one: 'Vogel', emoji: '🐦' },
  { id: 'mammal', de: 'Säugetiere', one: 'Säugetier', emoji: '🦌' },
  { id: 'insect', de: 'Insekten', one: 'Insekt', emoji: '🦋' },
  { id: 'plant', de: 'Pflanzen', one: 'Pflanze', emoji: '🌿' },
  { id: 'fungus', de: 'Pilze', one: 'Pilz', emoji: '🍄' },
  { id: 'amphibian', de: 'Amphibien', one: 'Amphibie', emoji: '🐸' },
  { id: 'reptile', de: 'Reptilien', one: 'Reptil', emoji: '🦎' },
]

export const MONTH = 8 // September, 0-based
