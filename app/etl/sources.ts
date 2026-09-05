// The per-species sources of the content job: iNaturalist photos, Commons file info, Wikipedia summaries, AnAge pages.
// Ported from scripts/etl-probe/assets.mjs and coverage.mjs (record 0002 E7 E8).
import { get, q } from './fetch'
import { commonsFileOf, commonsRejected, inatLicence, inatLicenceUrl, inatLicensed, parseAnAge, wikiPage } from './prune'

export type AssetDraft = { url: string; author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string; caption: string }

// ── iNaturalist ──────────────────────────────────────────────────────────────
type InatPhoto = { id: number; license_code: string | null; attribution: string; attribution_name?: string; medium_url?: string; url?: string }
type InatTaxon = { id: number; name: string; default_photo?: InatPhoto | null; taxon_photos?: { photo: InatPhoto }[] }

const inatAsset = (p: InatPhoto, sciName: string): AssetDraft => ({
  url: p.medium_url ?? p.url!.replace('square', 'medium'),
  author: p.attribution_name ?? p.attribution.replace(/^\(c\) /, '').replace(/,.*$/, ''),
  licence: inatLicence(p.license_code!),
  licenceUrl: inatLicenceUrl(p.license_code!),
  sourceUrl: `https://www.inaturalist.org/photos/${p.id}`,
  origin: 'inat',
  caption: sciName,
})

/** The iNat taxon for a scientific name (one call) with its default photo. */
export async function inatTaxon(sciName: string): Promise<InatTaxon | null> {
  const j = await get<{ results: InatTaxon[] }>(`https://api.inaturalist.org/v1/taxa?${q({ q: sciName, rank: 'species', per_page: 3 })}`)
  return j?.results.find((t) => t.name === sciName) ?? j?.results[0] ?? null
}
/** Ladder step 1: the default photo when licensed. */
export const inatDefault = (t: InatTaxon | null, sciName: string) => (t?.default_photo && inatLicensed(t.default_photo.license_code) ? inatAsset(t.default_photo, sciName) : null)
/** Ladder step 3: the next licensed photo among the taxon's curated photos (one more call). */
export async function inatNext(t: InatTaxon, sciName: string): Promise<AssetDraft | null> {
  const j = await get<{ results: InatTaxon[] }>(`https://api.inaturalist.org/v1/taxa/${t.id}`)
  const p = j?.results[0]?.taxon_photos?.map((x) => x.photo).find((x) => inatLicensed(x.license_code) && x.id !== t.default_photo?.id)
  return p ? inatAsset(p, sciName) : null
}

// ── Commons ──────────────────────────────────────────────────────────────────
type ImageInfo = { title: string; width: number; height: number; thumb: string; descriptionUrl: string; artist: string; licence: string; licenceUrl: string | null; cats: string }
type CommonsPage = { title: string; imageinfo?: { width: number; height: number; thumburl: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[]; categories?: { title: string }[] }

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

/** File info for many P18 URLs, 40 titles per call (as the probe). Missing files are absent from the map. */
export async function commonsInfo(p18Urls: string[]): Promise<Map<string, ImageInfo>> {
  const out = new Map<string, ImageInfo>()
  const titles = [...new Set(p18Urls.map(commonsFileOf))]
  for (let i = 0; i < titles.length; i += 40) {
    const j = await get<{ query?: { pages: Record<string, CommonsPage> }; normalized?: { from: string; to: string }[] }>(
      `https://commons.wikimedia.org/w/api.php?${q({ action: 'query', format: 'json', prop: 'imageinfo|categories', cllimit: 50, iiprop: 'url|size|extmetadata', iiurlwidth: 800, iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|Categories', titles: titles.slice(i, i + 40).join('|') })}`,
    )
    for (const p of Object.values(j?.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0]
      if (!ii) continue
      const m = ii.extmetadata ?? {}
      out.set(p.title, {
        title: p.title,
        width: ii.width,
        height: ii.height,
        thumb: ii.thumburl,
        descriptionUrl: ii.descriptionurl,
        artist: stripHtml(m.Artist?.value ?? ''),
        licence: m.LicenseShortName?.value ?? '',
        licenceUrl: m.LicenseUrl?.value ?? null,
        cats: `${m.Categories?.value ?? ''} ${(p.categories ?? []).map((c) => c.title).join('|')}`,
      })
    }
  }
  return out
}

/** Commons gives no LicenseUrl for public-domain and "Attribution" files: the PD mark, else the file page that states the terms. */
export const commonsLicenceUrl = (licence: string, url: string | null, descriptionUrl: string) => url ?? (/public domain|pd/i.test(licence) ? 'https://creativecommons.org/publicdomain/mark/1.0/' : descriptionUrl)

/** Ladder step 2: the P18 file unless it is a specimen, plate, larva, egg or map, or lacks author or licence. */
export function commonsAsset(info: Map<string, ImageInfo>, p18: string | undefined, sciName: string): AssetDraft | null {
  if (!p18) return null
  const f = info.get(commonsFileOf(p18))
  if (!f || commonsRejected(f.title, f.cats) || !f.licence) return null
  return { url: f.thumb, author: f.artist || 'unknown', licence: f.licence, licenceUrl: commonsLicenceUrl(f.licence, f.licenceUrl, f.descriptionUrl), sourceUrl: f.descriptionUrl, origin: 'commons', caption: f.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '') || sciName }
}

// ── Wikipedia ────────────────────────────────────────────────────────────────
export type Intro = { text: string; lang: string; source: string; licence: string }
type Summary = { extract?: string; content_urls?: { desktop?: { page?: string } } }

/** REST page/summary for one sitelink; null when the page is missing or the extract is too short to be an intro. */
export async function wikipediaIntro(sitelink: string | undefined, lang: 'de' | 'en'): Promise<Intro | null> {
  if (!sitelink) return null
  const s = await get<Summary>(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiPage(sitelink))}`)
  if (!s?.extract || s.extract.length < 80) return null
  return { text: s.extract, lang, source: s.content_urls?.desktop?.page ?? sitelink, licence: 'CC BY-SA 4.0' }
}

// ── AnAge ────────────────────────────────────────────────────────────────────
export type Fact = { value: string; source: string; url?: string }

/** The AnAge entry behind Wikidata P4024, scraped for longevity and clutch or litter size (E8). */
export async function anageFacts(id: string | undefined): Promise<Record<string, Fact>> {
  if (!id) return {}
  const url = `https://genomics.senescence.info/species/entry.php?species=${encodeURIComponent(id)}`
  const html = await get(url, { text: true })
  const parsed = parseAnAge(html)
  const out: Record<string, Fact> = {}
  if (parsed.lifespan) out.lifespan = { value: parsed.lifespan, source: 'AnAge', url }
  if (parsed.reproduction) out.reproduction = { value: parsed.reproduction, source: 'AnAge', url }
  return out
}
