// Pure rules of the content job (record 0002 E6 E7 E8 E9): name picking, the image ladder's reject list, GloBI kind
// folding and the cap, IUCN codes, AnAge parsing. No I/O; tested from src/server/routers/taxon.test.ts.

/**
 * A "name" that is the scientific name again: equal to it, or starting with its genus ("Turdus merula merula").
 * Shape alone cannot tell "Common blackbird" from a binomial, so the genus word decides.
 */
export const sciLike = (x: string | undefined | null, sciName: string) => !x || x.toLowerCase() === sciName.toLowerCase() || x.split(' ')[0] === sciName.split(' ')[0]

/** Wikipedia sitelink URL → page title without the disambiguation suffix: ".../wiki/Amsel_(Vogel)" → "Amsel". */
export const wikiTitle = (url: string | undefined | null) => (url ? decodeURIComponent(url.split('/').pop()!).replace(/_/g, ' ').replace(/ \(.*\)$/, '') : undefined)
/** The raw page title, suffix kept, for the REST summary call. */
export const wikiPage = (url: string) => decodeURIComponent(url.split('/').pop()!)

/**
 * E6: the German name is the dewiki sitelink title (Wikidata's German label is the Latin name by convention), else a
 * non-Latin German label. English: the enwiki title unless Latin, else a non-Latin English label. Names equal to the
 * scientific name are no names.
 */
export function pickNames(w: { sciName: string; deLabel?: string; enLabel?: string; jaLabel?: string; dewiki?: string; enwiki?: string }) {
  const names: Record<string, string> = {}
  const deTitle = wikiTitle(w.dewiki)
  const de = deTitle && !sciLike(deTitle, w.sciName) ? deTitle : sciLike(w.deLabel, w.sciName) ? undefined : w.deLabel
  const enTitle = wikiTitle(w.enwiki)
  const en = enTitle && !sciLike(enTitle, w.sciName) ? enTitle : sciLike(w.enLabel, w.sciName) ? undefined : w.enLabel
  if (de) names.de = de
  if (en) names.en = en
  if (w.jaLabel && !sciLike(w.jaLabel, w.sciName)) names.ja = w.jaLabel
  return names
}

/** Wikidata P141 label (English) → IUCN code; unknown labels are kept as they are. */
const IUCN: Record<string, string> = {
  'least concern': 'LC',
  'near threatened': 'NT',
  vulnerable: 'VU',
  endangered: 'EN',
  'critically endangered': 'CR',
  'extinct in the wild': 'EW',
  extinct: 'EX',
  'data deficient': 'DD',
  'lower risk/conservation dependent': 'LR/cd',
}
export const iucnCode = (label: string | undefined) => (label ? (IUCN[label.toLowerCase()] ?? label) : null)

/**
 * E7: Commons files that are not a live organism, by filename or category words. Word-anchored where the probe's
 * loose list mis-hit ("legg" → egg, "Emsworth" → no). Adds the plate publishers the probe found by eye: Köhler, Sturm,
 * Erbario, Herbar, Ypey, Dioscoride, "Illustration".
 */
export const COMMONS_REJECT =
  /herbari|specimen|museum|illustration|drawing|zeichnung|tafel|plate|skull|skelet|\begg|\bnest\b|\bmap\b|\bkarte|distribution|\brange\b|stuffed|taxidermy|pr[aä]parat|larva|caterpillar|raupe|\bseed|samen|pollen|microscop|mikroskop|mounted|k[öo]hler|sturm|erbario|herbar|ypey|dioscoride|botanical|\bcut\b/i
export const commonsRejected = (fileTitle: string, categories: string) => COMMONS_REJECT.test(`${fileTitle} ${categories}`)

/** Commons P18 URL → the File: title, decoded. */
export const commonsFileOf = (url: string) => 'File:' + decodeURIComponent(url.split('/').pop()!).replace(/_/g, ' ')

/** iNaturalist licence codes the ladder accepts (E7: CC0/BY/BY-NC; the SA and ND variants are attribution licences too). */
export const INAT_LICENCES = new Set(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd'])
export const inatLicensed = (code: string | null | undefined) => !!code && INAT_LICENCES.has(code)
export const inatLicence = (code: string) => (code === 'cc0' ? 'CC0 1.0' : code.toUpperCase().replace(/^CC-/, 'CC ') + ' 4.0')
export const inatLicenceUrl = (code: string) => (code === 'cc0' ? 'https://creativecommons.org/publicdomain/zero/1.0/' : `https://creativecommons.org/licenses/${code.replace(/^cc-/, '')}/4.0/`)

export type Kind = 'eats' | 'eatenBy' | 'pollinates' | 'hostOf' | 'parasiteOf' | 'visitsFlowersOf'
/** E9: six kinds kept; preysOn folds into eats and its mirror preyedUponBy into eatenBy; everything else is dropped. */
const KIND: Record<string, Kind> = { eats: 'eats', preysOn: 'eats', eatenBy: 'eatenBy', preyedUponBy: 'eatenBy', pollinates: 'pollinates', hostOf: 'hostOf', parasiteOf: 'parasiteOf', visitsFlowersOf: 'visitsFlowersOf' }
export const foldKind = (type: string): Kind | null => KIND[type] ?? null

/** GloBI target names worth resolving: a Latin genus, species or family, not "detritus" or "no name". */
export const usableTargetName = (name: string | undefined | null, source: string) => !!name && name !== source && /^[A-Z][a-z]+( [a-z-]+){0,2}$/.test(name)

export const EDGE_CAP = 200
/**
 * The cap of handoff 0006: unique (kind, target) pairs, targets in any region's set first (stable order), then the rest,
 * at most `cap` in total.
 */
export function capEdges<T extends { kind: Kind; target: string }>(edges: T[], inSet: (target: string) => boolean, cap = EDGE_CAP): T[] {
  const seen = new Set<string>()
  const unique = edges.filter((e) => {
    const k = `${e.kind}|${e.target}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return [...unique.filter((e) => inSet(e.target)), ...unique.filter((e) => !inSet(e.target))].slice(0, cap)
}

/** AnAge species page (HTML) → the two Steckbrief rows; "Maximum longevity 21.8 years (wild)", clutch or litter size. */
export function parseAnAge(html: string): { lifespan?: string; reproduction?: string } {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
  const out: { lifespan?: string; reproduction?: string } = {}
  const life = text.match(/Maximum longevity ([\d.]+ years(?: \((?:wild|captivity)\))?)/)
  if (life) out.lifespan = life[1]
  const parts: string[] = []
  const size = text.match(/(Clutch|Litter) size(?: \((?:oviparous|viviparous)\))? ([\d.]+)/)
  if (size) parts.push(`${size[1].toLowerCase()} size ${size[2]}`)
  const perYear = text.match(/(Clutches|Litters) per year ([\d.]+)/)
  if (perYear) parts.push(`${perYear[2]} ${perYear[1].toLowerCase()} per year`)
  const maturity = text.match(/Female sexual maturity ([\d.]+ days)/)
  if (maturity) parts.push(`mature at ${maturity[1]}`)
  if (parts.length) out.reproduction = parts.join(' · ')
  return out
}
