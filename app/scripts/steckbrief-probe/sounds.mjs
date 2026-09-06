// Step 3 of the Steckbrief grill (S2): xeno-canto API v3 needs a key (HTTP 401 without one, verified 2026-09-06). With
// XENO_CANTO_API_KEY in app/.env.local the script would query sp:"<name>" grp:<birds|frogs|grasshoppers> q:A per set
// species (one call each, ≤ 1 000) and tally clips, licences, bytes. Without it, coverage is the Wikidata P2426
// (xeno-canto species id) proxy from traits.mjs plus the group counts. Run from app/: node scripts/steckbrief-probe/sounds.mjs
import { join } from 'node:path'
import { HERE, keyOrNull, get, readJson, cached, md, pct, writeJson } from './lib.mjs'

const key = keyOrNull('XENO_CANTO_API_KEY')
const { taxa } = readJson(join(HERE, 'taxa.json'))
const wd = cached('wikidata-props') ?? {}
const GROUPS = { birds: (t) => t.tile === 'bird', frogs: (t) => t.tile === 'amphibian' && t.order === 'Anura', grasshoppers: (t) => t.order === 'Orthoptera', bats: (t) => t.order === 'Chiroptera' }
const rows = []
for (const [g, f] of Object.entries(GROUPS)) {
  const s = taxa.filter(f)
  const perRegion = ['Mainz-Bingen', 'Südwestpfalz', 'Schagen', 'Kyoto'].map((r) => s.filter((t) => t.regions.includes(r)).length)
  const p2426 = s.filter((t) => t.wikidataId && wd[t.wikidataId]?.P2426?.length).length
  rows.push([g, s.length, ...perRegion, `${p2426} (${pct(p2426, s.length)})`])
}
const proxy = md(['xeno-canto group', 'set species', 'Mainz-Bingen', 'Südwestpfalz', 'Schagen', 'Kyoto', 'with Wikidata P2426 id'], rows)
console.log(proxy)

if (!key) {
  console.log('\nNo key: S2 is answered from the API docs and the P2426 proxy. To run the real count: create an account at xeno-canto.org, copy the key from the account page into app/.env.local as XENO_CANTO_API_KEY, re-run.')
  writeJson(join(HERE, 'sounds.json'), { at: new Date().toISOString(), key: false, proxy: rows })
  process.exit(0)
}

// With a key: one call per species, the best clip = quality A, song over call, shortest. Never more than 1 000 calls.
const out = {}
const targets = taxa.filter((t) => Object.values(GROUPS).some((f) => f(t))).slice(0, 950)
for (const t of targets) {
  const grp = Object.entries(GROUPS).find(([, f]) => f(t))[0]
  const q = `sp:"${t.sciName}" grp:${grp}`
  const r = await get(`https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(q)}&per_page=100&key=${key}`)
  const recs = r.recordings ?? []
  const rank = (x) => (x.q === 'A' ? 0 : x.q === 'B' ? 1 : 2) * 1000 + (/song/i.test(x.type) ? 0 : 500) + (x.length?.split(':').reduce((a, b) => a * 60 + +b, 0) ?? 999)
  const best = [...recs].sort((a, b) => rank(a) - rank(b))[0] ?? null
  const lic = {}
  for (const x of recs) lic[x.lic?.replace(/.*licenses\//, '') ?? '?'] = (lic[x.lic?.replace(/.*licenses\//, '') ?? '?'] ?? 0) + 1
  out[t.gbifKey] = { sciName: t.sciName, grp, n: r.numRecordings, lic, best: best && { id: best.id, q: best.q, type: best.type, length: best.length, lic: best.lic, rec: best.rec, file: best.file } }
}
writeJson(join(HERE, 'sounds.json'), { at: new Date().toISOString(), key: true, proxy: rows, out })
const have = Object.values(out).filter((x) => x.n > 0).length
console.log(`species with ≥ 1 recording: ${have} / ${targets.length}`)
