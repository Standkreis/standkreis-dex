// Step 4 of the Steckbrief grill (S3): Claude Sonnet 5 writes two short paragraphs per species in de and en from the
// fact sheet only (facts.json: bulk datasets, Wikidata, GIFT, GloBI, month shares, region), never from Wikipedia. Every
// sentence carries fact ids; the validator rejects a draft with an uncited sentence or an unknown id. A second Sonnet
// call judges every sentence against the cited facts (the hallucination check). Cost from the usage fields, Sonnet 5
// prices from findings 0015 §💸. Sonnet 5 thinks by default and spent the whole 1 500-token budget on thinking on
// 11 of 20 drafts (output_tokens_details.thinking_tokens = 1500, empty text); the editor runs with thinking disabled. Messages API over fetch, like scripts/id-probe/claude.mjs (no SDK in package.json).
// Run from app/: ENV_FILE=<path to .env.local if not app/.env.local> node scripts/steckbrief-probe/prose.mjs
import { join } from 'node:path'
import { HERE, keyOrNull, cached, store, readJson, writeJson, md } from './lib.mjs'

const key = keyOrNull('ANTHROPIC_API_KEY')
if (!key) process.exit(1)
const MODEL = 'claude-sonnet-5'
const PRICE = { input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 10 } // $ per MTok
const sheets = readJson(join(HERE, 'facts.json'))
const REGION = 'Mainz-Bingen'
let calls = 0
const MAX_CALLS = 60

const SYSTEM = `You are the editor of a small nature atlas for people who walk in their own Landkreis. You write the "Steckbrief" text of one species page.

Hard rules:
1. Write ONLY from the numbered facts you are given. No outside knowledge, no Wikipedia, nothing you "know" about the species. If the facts do not say it, you do not say it.
2. Every sentence cites at least one fact id it rests on. A sentence that rests on nothing is not allowed. Do not invent ids.
3. Facts can be noisy database rows. Leave out a fact that is implausible or contradicts biology as the other facts describe it (for example a plant listed as "eating" animals, or an interaction partner from another continent). Prefer partners that carry a German name; they are the ones the reader can meet.
4. Numbers keep their unit. If a value's unit is unclear (the sheet says so), leave it out. Round sensibly for a reader (102.7 g → "rund 100 g").
5. Two paragraphs, together at most 140 words. Paragraph one: what the reader can see, how big, when and where in ${REGION} (use the month profile of ${REGION}; the other regions only if ${REGION} is missing). Paragraph two: how it lives: food, partners, reproduction, lifespan, status. Plain, warm, precise. No headings, no bullet points, no "according to the data".
6. Do not repeat the species' names in every sentence. No emoji.

Answer with JSON only:
{"paragraphs":[{"sentences":[{"text":"<one sentence>","cites":["F3","F7"]}, ...]}, {"sentences":[...]}]}`

const JUDGE = `You check a species text against the numbered facts it was written from. For every sentence decide:
"supported" (every claim in the sentence follows from the cited facts), "partial" (some claim goes beyond the cited facts or uses an uncited fact), "unsupported" (the sentence states something no fact says, or contradicts one). Be strict: rounding is fine, a unit change is fine, an added adjective about behaviour, colour or place that no fact contains is not.
Answer with JSON only: {"sentences":[{"n":1,"verdict":"supported|partial|unsupported","why":"<short, empty when supported>"}]}`

async function claude({ id, system, user, max_tokens = 1500 }) {
  const hit = cached(id)
  if (hit && hit.status === 200 && hit.json) return hit // a truncated or unparsable answer is retried
  if (++calls > MAX_CALLS) throw new Error('request cap')
  const body = { model: MODEL, max_tokens, thinking: { type: 'disabled' }, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: user }] }
  const t0 = performance.now()
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const text = await r.text()
  if (r.status === 401 || r.status === 403) { console.error(`ANTHROPIC_API_KEY rejected: HTTP ${r.status}`); process.exit(2) }
  let res; try { res = JSON.parse(text) } catch { res = { raw: text } }
  const u = res.usage ?? {}
  const cost = ((u.input_tokens ?? 0) * PRICE.input + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.output_tokens ?? 0) * PRICE.output) / 1e6
  const out = { id, status: r.status, ms: Math.round(performance.now() - t0), at: new Date().toISOString(), usage: res.usage ?? null, cost, text: res.content?.map((c) => c.text ?? '').join('') ?? null, error: res.error ?? (r.ok ? null : res) }
  try { out.json = JSON.parse((out.text ?? '').replace(/^```(?:json)?\s*|\s*```$/g, '')) } catch { out.json = null }
  store(id, out)
  return out
}

/** The validator: every sentence has ≥ 1 cite, every cite exists, two paragraphs, non-empty text. Returns the list of problems. */
export function validate(draft, facts) {
  const ids = new Set(facts.map((f) => f.id)), problems = []
  const ps = draft?.paragraphs
  if (!Array.isArray(ps) || ps.length < 1) return ['no paragraphs']
  if (ps.length !== 2) problems.push(`${ps.length} paragraphs, expected 2`)
  ps.forEach((p, i) => { if (!Array.isArray(p.sentences) || !p.sentences.length) problems.push(`p${i + 1}: no sentences`) })
  ps.forEach((p, i) => (p.sentences ?? []).forEach((s, j) => {
    if (!s.text?.trim()) problems.push(`p${i + 1}s${j + 1}: empty`)
    if (!Array.isArray(s.cites) || !s.cites.length) problems.push(`p${i + 1}s${j + 1}: no citation`)
    for (const c of s.cites ?? []) if (!ids.has(c)) problems.push(`p${i + 1}s${j + 1}: unknown id ${c}`)
  }))
  const words = ps.flatMap((p) => p.sentences ?? []).map((s) => s.text).join(' ').split(/\s+/).length
  if (words > 170) problems.push(`${words} words`)
  return problems
}

const results = {}
const costRows = []
let total = 0
for (const [sciName, sheet] of Object.entries(sheets)) {
  results[sciName] = { tile: sheet.tile, names: sheet.names, facts: sheet.facts, drafts: {} }
  for (const lang of ['de', 'en']) {
    const user = `Language: ${lang === 'de' ? 'German (Du-form is not used; neutral "man" or no address)' : 'English'}.\nSpecies: ${sciName}${sheet.names?.[lang] ? ` (${sheet.names[lang]})` : ''}.\nRegion of the reader: ${REGION}.\n\nFACTS:\n${sheet.facts.map((f) => `${f.id} [${f.source}] ${f.text}`).join('\n')}`
    const r = await claude({ id: `prose-${sheet.gbifKey}-${lang}`, system: SYSTEM, user })
    const problems = r.json ? validate(r.json, sheet.facts) : ['no JSON']
    // Judge: sentence by sentence against the cited facts.
    let judge = null
    if (r.json && !problems.some((p) => p.startsWith('no'))) {
      const sentences = r.json.paragraphs.flatMap((p) => p.sentences ?? [])
      const ju = `FACTS:\n${sheet.facts.map((f) => `${f.id} [${f.source}] ${f.text}`).join('\n')}\n\nTEXT (sentence n, cited ids, text):\n${sentences.map((s, i) => `${i + 1}. [${(s.cites ?? []).join(',')}] ${s.text}`).join('\n')}`
      const j = await claude({ id: `judge-${sheet.gbifKey}-${lang}`, system: JUDGE, user: ju, max_tokens: 1200 })
      judge = j.json?.sentences ?? null
      total += j.cost
      costRows.push([sciName, `judge ${lang}`, j.usage?.input_tokens ?? 0, j.usage?.cache_creation_input_tokens ?? 0, j.usage?.cache_read_input_tokens ?? 0, j.usage?.output_tokens ?? 0, (100 * j.cost).toFixed(2)])
    }
    total += r.cost
    costRows.push([sciName, `prose ${lang}`, r.usage?.input_tokens ?? 0, r.usage?.cache_creation_input_tokens ?? 0, r.usage?.cache_read_input_tokens ?? 0, r.usage?.output_tokens ?? 0, (100 * r.cost).toFixed(2)])
    results[sciName].drafts[lang] = { draft: r.json, problems, judge, usage: r.usage, cost: r.cost, ms: r.ms }
    const verdicts = judge ? judge.map((s) => s.verdict[0]).join('') : '?'
    console.log(`${sciName} ${lang}: ${problems.length ? '✗ ' + problems.join('; ') : '✓ valid'} · judge ${verdicts} · ${(100 * r.cost).toFixed(2)} ¢ · ${r.ms} ms`)
  }
}
writeJson(join(HERE, 'prose.json'), { at: new Date().toISOString(), model: MODEL, price: PRICE, region: REGION, system: SYSTEM, judge: JUDGE, results, cost: { total, rows: costRows } })
console.log(md(['species', 'call', 'input', 'cache write', 'cache read', 'output', '¢'], costRows))
console.log(`total ${total.toFixed(4)} $ for ${costRows.length} calls`)
