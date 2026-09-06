// Step 3 of the ID grill: Claude vision on the 18, two prompts (FREE, SET-constrained) with claude-sonnet-5, plus claude-opus-5
// FREE on the ten misty shots. Messages API over fetch, image as base64 JPEG (≤ 1600 px), JSON out, every response cached
// under .cache/claude-<model>-<prompt>-<n>.json with latency and usage. Run from app/: node scripts/id-probe/claude.mjs
import { requireKey, cached, store, labels, set, photo, MISTY } from './lib.mjs'

const key = requireKey('ANTHROPIC_API_KEY')
const SONNET = 'claude-sonnet-5', OPUS = 'claude-opus-5'
const MAX = 200
let calls = 0

const FREE = `You are an experienced field naturalist in Rheinhessen (Landkreis Mainz-Bingen, Germany). A hiker took this photo from a path and wants to know what it shows. Identify the organism.
Rules: be honest about what the photo can and cannot show. If a species cannot be told apart from the visible evidence, stop at the genus or family. If the photo shows several species with no single subject, answer "several". If nothing can be said, answer "cannot tell".
Answer with JSON only, no prose around it:
{"answer": "<scientific name at the finest rank you are confident in, or 'several' or 'cannot tell'>",
 "rank": "species|genus|family|none",
 "de": "<German common name or null>",
 "ladder": {"family": "...", "genus": "... or null", "species": "... or null"},
 "evidence": ["<visible feature 1>", "..."],
 "context": "<non-biological clues you used: stake, bench, hand, pot, mist ... or null>",
 "confidence": <0..1 for the answer as given>,
 "alternatives": ["<other candidates, scientific names>"],
 "hint_de": "<one short German sentence telling the hiker what to photograph next to get to species, or null if not needed>"}`

const CONSTRAINED_SYS = (list) => `You are an experienced field naturalist. A hiker in Landkreis Mainz-Bingen (Rheinhessen, Germany) took a photo. The region's list of plausible species (scientific name · German name) is below; it is complete for this purpose.
Answer ONLY with one of: a scientific name copied exactly from the list, "outside the set" (the organism is not on the list: cultivated, exotic, pot plant, or a species missing here), "several" (no single subject), or "cannot tell".
Never force an organism onto a list member it is not. Be honest about the limits of a distance shot: if only the genus is clear and the list holds several species of it, answer "several" and name the genus in the ladder.
Answer with JSON only:
{"answer": "<name from the list | outside the set | several | cannot tell>",
 "de": "<German name from the list or null>",
 "ladder": {"family": "...", "genus": "... or null", "species": "... or null"},
 "evidence": ["<visible features>"],
 "context": "<non-biological clues or null>",
 "confidence": <0..1>,
 "candidates": ["<list members considered, scientific names>"],
 "if_outside": "<when the answer is outside the set: what you think it is, or null>",
 "hint_de": "<one short German sentence on what to photograph next, or null>"}

THE LIST (${list.length} species):
${list.map((r) => `${r.sciName} · ${r.de ?? '—'}`).join('\n')}`

const CONSTRAINED_USER = 'Identify the organism in this photo using only the list in your instructions. JSON only.'

async function ask({ model, prompt, n, system, user }) {
  const id = `claude-${model}-${prompt}-${n}`
  const hit = cached(id)
  if (hit && hit.status === 200) return hit // failed calls are not reused
  if (++calls > MAX) throw new Error('request cap')
  const body = {
    model, max_tokens: model === OPUS ? 4000 : 700, // Opus 5 thinks before answering (256 to 1600+ tokens on the misty walnut): 700 and 1600 truncated it
    ...(system ? { system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] } : {}),
    messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photo(n).toString('base64') } }, { type: 'text', text: user }] }],
  }
  const t0 = performance.now()
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const ms = Math.round(performance.now() - t0)
  const text = await r.text()
  if (r.status === 401 || r.status === 403) { console.error(`ANTHROPIC_API_KEY rejected: HTTP ${r.status}`); process.exit(2) }
  let res; try { res = JSON.parse(text) } catch { res = { raw: text } }
  const out = { n, model, prompt, status: r.status, ms, at: new Date().toISOString(), usage: res.usage ?? null, text: res.content?.map((c) => c.text ?? '').join('') ?? null, error: res.error ?? (r.ok ? null : res) }
  try { out.json = JSON.parse((out.text ?? '').replace(/^```(?:json)?\s*|\s*```$/g, '')) } catch { out.json = null }
  store(id, out)
  return out
}

const list = set()
const sys = CONSTRAINED_SYS(list)
const inSet = new Set(list.map((r) => r.sciName))
const jobs = []
for (const l of labels()) {
  const n = Number(l.n)
  jobs.push({ model: SONNET, prompt: 'free', n, user: FREE })
  jobs.push({ model: SONNET, prompt: 'set', n, system: sys, user: CONSTRAINED_USER })
  if (MISTY.includes(n)) jobs.push({ model: OPUS, prompt: 'free', n, user: FREE })
}
// The constrained system prompt is cached after the first call: run the first job alone, then three at a time.
const rows = []
const run = async (j) => {
  const r = await ask(j)
  const a = r.json?.answer ?? r.error?.message ?? r.error?.type ?? `HTTP ${r.status}`
  rows.push({ n: j.n, model: j.model, prompt: j.prompt, status: r.status, ms: r.ms, usage: r.usage, answer: r.json?.answer ?? null, rank: r.json?.rank ?? null, ladder: r.json?.ladder ?? null, confidence: r.json?.confidence ?? null, inSet: inSet.has(r.json?.answer), json: r.json })
  console.log(`${String(j.n).padStart(2)} ${j.model.padEnd(16)} ${j.prompt.padEnd(4)} ${r.status} ${String(r.ms).padStart(6)} ms  ${a}  conf=${r.json?.confidence ?? '-'}  tok in=${r.usage?.input_tokens ?? '-'} cw=${r.usage?.cache_creation_input_tokens ?? 0} cr=${r.usage?.cache_read_input_tokens ?? 0} out=${r.usage?.output_tokens ?? '-'}`)
}
const first = jobs.find((j) => j.prompt === 'set')
await run(first)
const rest = jobs.filter((j) => j !== first)
for (let i = 0; i < rest.length; i += 3) await Promise.all(rest.slice(i, i + 3).map(run))
rows.sort((a, b) => a.n - b.n || a.model.localeCompare(b.model) || a.prompt.localeCompare(b.prompt))
store('claude-summary', rows)
console.log('calls this run:', calls)
