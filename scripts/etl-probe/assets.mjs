// E7 images. For the list: Commons lead image via Wikidata P18 (size, aspect, category hints), iNat default photo + licence.
// node assets.mjs --region Mainz-Bingen --month 9 --threshold 10
import { arg, get, load, pool, q, requests, save, table, wikidataForGbif } from './lib.mjs'

const region = arg('region', 'Mainz-Bingen'), month = Number(arg('month', 9)), t = Number(arg('threshold', 10))
const list = load(`year-${region.toLowerCase()}.json`).list // E2 set
// iNat is 1 req/s: sample 20 per tile for the iNat half, Commons runs on everything
const sampled = new Set(); for (const g of new Set(list.map((r) => r.group))) list.filter((r) => r.group === g).sort(() => Math.random() - 0.5).slice(0, 20).forEach((r) => sampled.add(r.key))
const log = (...a) => console.log(...a, '\n')
log(`# 🔬 assets.mjs · ${region} · whole-year set → ${list.length} species · iNat sampled ${sampled.size}`)
const wd = await wikidataForGbif(list.map((r) => String(r.key)))

// Commons: imageinfo for each P18 file. Herbarium / specimen / illustration detection by category + filename words.
const BAD = /herbari|specimen|museum|illustration|drawing|zeichnung|tafel|plate|skull|skelet|egg|ei_|nest|map|karte|distribution|range|stuffed|taxidermy|preparat|larva|caterpillar|raupe|seed|samen|pollen|microscop|mikroskop/i
const fileOf = (url) => 'File:' + decodeURIComponent(url.split('/').pop()).replace(/_/g, ' ')
const titles = list.filter((r) => wd[r.key]?.img).map((r) => fileOf(wd[r.key].img))
const info = {}
for (let i = 0; i < titles.length; i += 40) {
  const j = await get(`https://commons.wikimedia.org/w/api.php?${q({ action: 'query', format: 'json', prop: 'imageinfo|categories', cllimit: 50, iiprop: 'url|size|extmetadata', iiurlwidth: 480, iiextmetadatafilter: 'Artist|LicenseShortName|Categories', titles: titles.slice(i, i + 40).join('|') })}`)
  for (const p of Object.values(j.query.pages)) { const ii = p.imageinfo?.[0]; if (ii) info[p.title] = { w: ii.width, h: ii.height, license: ii.extmetadata?.LicenseShortName?.value, cats: (ii.extmetadata?.Categories?.value ?? '') + ' ' + (p.categories ?? []).map((c) => c.title).join('|'), thumb: ii.thumburl } }
}
const e7 = { total: list.length, p18: 0, commonsOk: 0, suspect: 0, portrait: 0, landscape: 0, square: 0, small: 0, inatSampled: 0, inat: 0, inatCC0orBY: 0, inatNC: 0, inatAllRights: 0, inatOnly: 0, none: 0 }
const suspects = [], licences = {}
const rows = []
await pool(list, 3, async (r) => {
  const w = wd[r.key]; const f = w?.img ? info[fileOf(w.img)] : null
  const inat = sampled.has(r.key) ? await get(`https://api.inaturalist.org/v1/taxa?${q({ q: r.sci, rank: 'species', per_page: 1 })}`) : null
  const tx = inat?.results?.find((x) => x.name === r.sci) ?? inat?.results?.[0]
  const ph = tx?.default_photo
  rows.push({ sci: r.sci, de: r.de, commons: f ? { ...f, cats: undefined, suspect: BAD.test(fileOf(w.img) + ' ' + f.cats) } : null, inat: ph ? { license: ph.license_code, url: ph.medium_url, attribution: ph.attribution } : null })
  if (w?.img) e7.p18++
  if (f) {
    e7.commonsOk++
    licences[f.license] = (licences[f.license] ?? 0) + 1
    const ar = f.w / f.h; if (ar > 1.2) e7.landscape++; else if (ar < 0.83) e7.portrait++; else e7.square++
    if (Math.min(f.w, f.h) < 600) e7.small++
    if (BAD.test(fileOf(w.img) + ' ' + f.cats)) { e7.suspect++; suspects.push(`${r.de || r.sci}: ${fileOf(w.img).slice(5, 60)}`) }
  }
  if (sampled.has(r.key)) { e7.inatSampled++; if (ph) { e7.inat++; if (['cc0', 'cc-by', 'cc-by-sa'].includes(ph.license_code)) e7.inatCC0orBY++; else if (ph.license_code) e7.inatNC++; else e7.inatAllRights++; if (!f) e7.inatOnly++ } if (!f && !ph) e7.none++ }
})
log('## E7 · images\n')
log(table(['measure', 'n', 'share'], Object.entries(e7).map(([k, v]) => [k, v, `${((100 * v) / (k.startsWith('inat') || k === 'none' ? e7.inatSampled : list.length)).toFixed(0)}%`])))
log('Commons licences on the lead images:\n\n' + table(['licence', 'n'], Object.entries(licences).sort((a, b) => b[1] - a[1])))
log('Suspect lead images (herbarium, specimen, illustration, egg, larva … by filename or category):\n\n- ' + suspects.slice(0, 25).join('\n- '))
save(`assets-${region.toLowerCase()}-m${month}.json`, { threshold: t, e7, licences, suspects, rows })
log(`requests: ${JSON.stringify(requests())}`)
