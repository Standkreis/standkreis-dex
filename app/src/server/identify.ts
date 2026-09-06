import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { env } from './env'
import type { Locale } from './locale'

// The scan (handoff 0016 Track A, record 0003 I1–I6): one Claude Sonnet 5 call per photo, held to the region's set.
// The prompt is the grill's set prompt (`scripts/id-probe/claude.mjs`) with the subject gate in front (I3) and the
// output language following the request (I4). The model's JSON is validated here; the join to the set and the
// threshold (A3, A4) are pure functions so the tests run on recorded answers, never on the network.

export const MODEL = 'claude-sonnet-5'
/** Species rank is shown only at or above this confidence (record 0003 I3, handoff A4); below, the genus is the answer. */
export const THRESHOLD = 0.7
export const TIMEOUT_MS = 25_000
const MAX_TOKENS = 1000 // the answer is ~300–500 tokens; Sonnet 5 may spend a few hundred more thinking (findings 0015 §💸)
/** USD per MTok: input, 5-min cache write, cache read, output. platform.claude.com/docs/en/about-claude/pricing, read 2026-09-06. */
export const PRICE = { input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 10 }
const API = 'https://api.anthropic.com'
const HONEST = new Set(['outside the set', 'several', 'cannot tell'])

export type SetRow = { gbifKey: number; sciName: string; de: string | null }
export type RegionInfo = { id: string; name: string; higher: string }
export type RegionSet = { region: RegionInfo; rows: SetRow[]; bySci: Map<string, SetRow>; at: number }
export type Ladder = { family: string | null; genus: string | null; species: string | null }
export type Subject = 'single' | 'several' | 'none'
export type Usage = { input_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number; output_tokens?: number }
export type Cost = { input: number; cacheWrite: number; cached: number; output: number; cents: number }
export type Answer = { gbifKey: number; sciName: string }
export type IdentifyResult = {
  subject: Subject
  /** A set member (or a backbone species for an outside name) at species rank, only at confidence ≥ THRESHOLD; else null. */
  answer: Answer | null
  /** What the model thinks it is when it is not on the list: a scientific name when it gave one, else its words. */
  outside: string | null
  confidence: number
  ladder: Ladder
  evidence: string[]
  hint: string | null
  cost: Cost
}
export type SearchFn = (q: string) => Promise<{ gbifKey: number; sciName: string }[]>

// ── The model's JSON ────────────────────────────────────────────────────────────────────────────────────────────────
const str = z.string().nullish()
export const modelAnswer = z.object({
  subject: z.enum(['single', 'several', 'none']),
  answer: z.string().trim().min(1),
  name: str,
  ladder: z.object({ family: str, genus: str, species: str }).nullish(),
  evidence: z.array(z.string()).nullish(),
  context: str,
  confidence: z.number().min(0).max(1),
  candidates: z.array(z.string()).nullish(),
  if_outside: str,
  hint: str,
})
export type ModelAnswer = z.infer<typeof modelAnswer>

/** The text the model returned → the shape above. A fence around the JSON is tolerated; anything else is a typed error, not a 500. */
export function parseAnswer(text: string): ModelAnswer {
  const body = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  let raw: unknown
  try { raw = JSON.parse(body) } catch { throw new TRPCError({ code: 'UNPROCESSABLE_CONTENT', message: 'engine answered no JSON' }) }
  const parsed = modelAnswer.safeParse(raw)
  if (!parsed.success) throw new TRPCError({ code: 'UNPROCESSABLE_CONTENT', message: `engine JSON: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` })
  return parsed.data
}

// ── The prompt ──────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * The list is the first system block and carries the cache breakpoint: 929 lines, ~19 k tokens, written once per
 * region per five minutes and read for 0.39 ¢ after that (findings 0015 §💸). The instructions follow as a second
 * block with its own breakpoint, so both languages share the list's entry and each adds its ~600-token tail. Rows
 * come sorted by `sciName`: the bytes must be identical call to call or the cache misses.
 */
export const listBlock = (region: RegionInfo, rows: SetRow[]) =>
  `THE LIST for ${region.name} (${region.higher}), ${rows.length} species (scientific name · German name):\n${rows.map((r) => `${r.sciName} · ${r.de ?? '—'}`).join('\n')}`

const SHAPE = (lang: string) => `{"subject": "single | several | none",
 "answer": "<name copied from the list | outside the set | several | cannot tell>",
 "name": "<German name from the list, or null>",
 "ladder": {"family": "... or null", "genus": "... or null", "species": "... or null"},
 "evidence": ["<visible features, in ${lang}>"],
 "context": "<non-biological clues you used (stake, pot, hand, mist ...) in ${lang}, or null>",
 "confidence": <0..1 for the answer as given>,
 "candidates": ["<list members considered, scientific names>"],
 "if_outside": "<when the answer is outside the set: the scientific name you think it is, or null>",
 "hint": "<one short sentence in ${lang} telling the hiker what to photograph next to reach species rank, or null if not needed>"}`

export function instructions(locale: Locale, region: RegionInfo): string {
  if (locale === 'de')
    return `Du bist ein erfahrener Feldbiologe. Ein Wanderer im Landkreis ${region.name} (${region.higher}) hat dieses Foto vom Weg aus gemacht. Die Liste der hier plausiblen Arten (wissenschaftlicher Name · deutscher Name) steht oben; für diesen Zweck ist sie vollständig.
Entscheide zuerst das Motiv ("subject"): "single" (ein Organismus ist klar das Motiv), "several" (mehrere Arten, kein einzelnes Motiv, etwa eine Waldszene) oder "none" (kein Organismus: Stein, Gebäude, verwackelt).
Dann die Antwort ("answer"), NUR eines davon: ein wissenschaftlicher Name exakt aus der Liste; "outside the set" (der Organismus steht nicht auf der Liste: kultiviert, exotisch, Topfpflanze, oder eine Art, die hier fehlt); "several"; oder "cannot tell".
Zwinge nie einen Organismus auf ein Listenmitglied, das er nicht ist. Sei ehrlich über die Grenzen einer Fernaufnahme: Ist nur die Gattung klar und die Liste enthält mehrere Arten davon, antworte "cannot tell" und nenne die Gattung in der Leiter ("ladder"), die Art bleibt null.
Schreibe evidence, context und hint auf Deutsch, kurz und konkret. Antworte nur mit JSON, ohne Text darum herum:
${SHAPE('German')}`
  return `You are an experienced field naturalist. A hiker in ${region.name} (${region.higher}) took this photo from a path. The region's list of plausible species (scientific name · German name) is above; it is complete for this purpose.
First decide the subject: "single" (one organism is clearly the subject), "several" (several species with no single subject, say a forest scene) or "none" (no organism: a rock, a building, a blurred frame).
Then the answer, ONLY one of: a scientific name copied exactly from the list; "outside the set" (the organism is not on the list: cultivated, exotic, pot plant, or a species missing here); "several"; or "cannot tell".
Never force an organism onto a list member it is not. Be honest about the limits of a distance shot: if only the genus is clear and the list holds several species of it, answer "cannot tell" and name the genus in the ladder, species null.
Write evidence, context and hint in English, short and concrete. Answer with JSON only, no prose around it:
${SHAPE('English')}`
}
export const userText = (locale: Locale) => (locale === 'de' ? 'Bestimme den Organismus auf diesem Foto, nur mit der Liste aus deinen Anweisungen. Nur JSON.' : 'Identify the organism in this photo using only the list in your instructions. JSON only.')

// ── The set, once per region in this process ───────────────────────────────────────────────────────────────────────
const SET_TTL = 3_600_000 // an hour: the ETL refresh lands on the next build of the prompt, not the next request
const sets: Map<string, Promise<RegionSet>> = ((globalThis as unknown as { __dexIdSets?: Map<string, Promise<RegionSet>> }).__dexIdSets ??= new Map())
export async function regionSet(regionId: string, load: () => Promise<{ region: RegionInfo; rows: SetRow[] } | null>): Promise<RegionSet | null> {
  const hit = sets.get(regionId)
  if (hit) { const s = await hit; if (Date.now() - s.at < SET_TTL) return s }
  const p = load().then((r) => {
    if (!r) throw new TRPCError({ code: 'NOT_FOUND', message: 'unknown region' })
    const rows = [...r.rows].sort((a, b) => a.sciName.localeCompare(b.sciName, 'en'))
    return { region: r.region, rows, bySci: new Map(rows.map((x) => [x.sciName, x])), at: Date.now() }
  })
  sets.set(regionId, p)
  try { return await p } catch (e) { sets.delete(regionId); if (e instanceof TRPCError && e.code === 'NOT_FOUND') return null; throw e }
}

// ── The join and the threshold ─────────────────────────────────────────────────────────────────────────────────────
const clean = (s: string | null | undefined) => { const t = (s ?? '').trim(); return t && !/^(null|none|—|-)$/i.test(t) ? t : null }
/** A rung is a Latin name or nothing: one capitalised word for family and genus, a binomial for the species. Prose ("Baum, Familie unklar") is null. */
const rung = (s: string | null | undefined, words: 1 | 2) => { const t = clean(s); return t && new RegExp(words === 1 ? '^[A-Z][a-z]+$' : '^[A-Z][a-z]+ [a-z]+(?:-[a-z]+)?$').test(t) ? t : null }
/**
 * The binomial in a free-text guess ("Cultivated bonsai, likely Ficus microcarpa or similar" → "Ficus microcarpa"): the one
 * in the ladder's genus when it names one, else the first that does not open a sentence (English prose starts with a capital too).
 */
export function firstBinomial(s: string | null | undefined, genus?: string | null): string | null {
  if (!s) return null
  const all = [...s.matchAll(/(^|[^A-Za-z])([A-Z][a-z]+ [a-z]{3,}(?:-[a-z]+)?)\b/g)].map((m) => ({ at: m.index + m[1].length, name: m[2] }))
  if (!all.length) return null
  if (genus) { const g = all.find((m) => m.name.startsWith(`${genus} `)); if (g) return g.name }
  return (all.find((m) => m.at > 0 && !/[.!?]\s*$/.test(s.slice(0, m.at))) ?? all[0]).name
}

/**
 * A3, A4 (record 0003 I3, I4). `answer` is a set member by exact `sciName`, at species rank only from THRESHOLD up.
 * A name outside the set (the model said so, or wrote one the list does not have) goes through the backbone search
 * for a key, exact `sciName` only; the genus-only case stays null: the ladder's genus is what the client shows and
 * searches with (the backbone search returns species, a genus has no key there). Nothing is ever created.
 */
export async function join(m: ModelAnswer, bySci: Map<string, SetRow>, search: SearchFn): Promise<Omit<IdentifyResult, 'cost'>> {
  const confident = m.confidence >= THRESHOLD
  const ladder: Ladder = { family: rung(m.ladder?.family, 1), genus: rung(m.ladder?.genus, 1), species: confident ? rung(m.ladder?.species, 2) : null }
  const base = { confidence: m.confidence, ladder, evidence: (m.evidence ?? []).map((e) => e.trim()).filter(Boolean), hint: clean(m.hint) }
  const a = m.answer.trim()
  let subject: Subject = m.subject
  if (a === 'several' && subject === 'single') subject = 'several'
  if (subject === 'none') return { subject, answer: null, outside: firstBinomial(m.if_outside, ladder.genus) ?? clean(m.if_outside), ...base }
  if (subject === 'several') return { subject, answer: null, outside: null, ...base }
  if (a === 'cannot tell') return { subject, answer: null, outside: null, ...base }
  // Outside the set: the model's own name, or a name that is not on the list, which is the same thing. A guess that
  // is on the list after all ("outside the set … Malus domestica", row 8 of the fixture) is the member it names.
  const guess = a !== 'outside the set' && !HONEST.has(a) ? a : (firstBinomial(m.if_outside, ladder.genus) ?? clean(m.if_outside))
  const binomial = firstBinomial(guess, ladder.genus)
  const member = bySci.get(a) ?? (binomial ? bySci.get(binomial) : undefined)
  if (member) {
    if (confident && !ladder.species) ladder.species = member.sciName
    return { subject, answer: confident ? { gbifKey: member.gbifKey, sciName: member.sciName } : null, outside: null, ...base }
  }
  let answer: Answer | null = null
  if (binomial && confident) {
    const hits = await search(binomial).catch(() => [])
    const hit = hits.find((h) => h.sciName === binomial)
    if (hit) answer = { gbifKey: hit.gbifKey, sciName: hit.sciName }
  }
  if (!ladder.species && binomial && confident) ladder.species = binomial
  return { subject, answer, outside: guess, ...base }
}

export function cost(u: Usage | null | undefined): Cost {
  const input = u?.input_tokens ?? 0, cacheWrite = u?.cache_creation_input_tokens ?? 0, cached = u?.cache_read_input_tokens ?? 0, output = u?.output_tokens ?? 0
  const cents = ((input * PRICE.input + cacheWrite * PRICE.cacheWrite + cached * PRICE.cacheRead + output * PRICE.output) / 1e6) * 100
  return { input, cacheWrite, cached, output, cents: +cents.toFixed(3) }
}

// ── The call ───────────────────────────────────────────────────────────────────────────────────────────────────────
type MessagesResponse = { content?: { type: string; text?: string }[]; usage?: Usage; stop_reason?: string; error?: { type?: string; message?: string } }
export const isJpeg = (b: Uint8Array) => b.length > 4 && b[0] === 0xff && b[1] === 0xd8

/**
 * One Messages API call over fetch (no SDK: one endpoint, one body, and the timeout, the status codes and the cache
 * usage are all in plain sight; the probe used the same call). Every failure is a TRPCError with a code the client can
 * word: 415 for bytes that are no image, 429 passed through, 408 for the timeout, 502 for the engine being down,
 * 422 for an answer that is not the JSON asked for.
 */
export async function askClaude({ system, user, jpeg, signal }: { system: { text: string; cached?: boolean }[]; user: string; jpeg: Uint8Array; signal?: AbortSignal }): Promise<{ text: string; usage: Usage | null; ms: number }> {
  const key = env.ANTHROPIC_API_KEY
  if (!key) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'ANTHROPIC_API_KEY not set' })
  if (!isJpeg(jpeg)) throw new TRPCError({ code: 'UNSUPPORTED_MEDIA_TYPE', message: 'not a JPEG' })
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: system.map((s) => ({ type: 'text', text: s.text, ...(s.cached ? { cache_control: { type: 'ephemeral' } } : {}) })),
    messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: Buffer.from(jpeg).toString('base64') } }, { type: 'text', text: user }] }],
  }
  const t0 = performance.now()
  let r: Response
  try {
    r = await fetch(`${env.ANTHROPIC_BASE_URL ?? API}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') throw new TRPCError({ code: 'TIMEOUT', message: `engine did not answer within ${TIMEOUT_MS / 1000} s` })
    throw new TRPCError({ code: 'BAD_GATEWAY', message: 'engine unreachable' })
  }
  const ms = Math.round(performance.now() - t0)
  let res: MessagesResponse
  try { res = (await r.json()) as MessagesResponse } catch { throw new TRPCError({ code: 'BAD_GATEWAY', message: `engine answered ${r.status} without JSON` }) }
  if (r.status === 429) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'engine rate limit' })
  if (r.status === 400 && /image/i.test(res.error?.message ?? '')) throw new TRPCError({ code: 'UNSUPPORTED_MEDIA_TYPE', message: 'engine could not read the image' })
  if (r.status === 401 || r.status === 403) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'engine rejected the key' })
  if (!r.ok) throw new TRPCError({ code: 'BAD_GATEWAY', message: `engine ${r.status} ${res.error?.type ?? ''}`.trim() })
  if (res.stop_reason === 'max_tokens') throw new TRPCError({ code: 'UNPROCESSABLE_CONTENT', message: 'engine answer truncated' })
  const text = (res.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
  return { text, usage: res.usage ?? null, ms }
}

/** The whole scan for one JPEG against one region's set. Throws only TRPCErrors. */
export async function identify({ jpeg, set, locale, search, signal }: { jpeg: Uint8Array; set: RegionSet; locale: Locale; search: SearchFn; signal?: AbortSignal }): Promise<IdentifyResult & { ms: number }> {
  // Two breakpoints: the list (shared by both languages) and the instructions after it (one entry per language).
  const system = [{ text: listBlock(set.region, set.rows), cached: true }, { text: instructions(locale, set.region), cached: true }]
  const { text, usage, ms } = await askClaude({ system, user: userText(locale), jpeg, signal })
  const parsed = parseAnswer(text)
  const joined = await join(parsed, set.bySci, search)
  return { ...joined, cost: cost(usage), ms }
}
