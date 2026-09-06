// Step 4 of the ID grill: one Markdown table, 18 rows × engines, scored against the `guess` column of labels.csv
// (the agent's first read, not yet corrected by the owner), plus cost and latency per engine. Run from app/: node scripts/id-probe/score.mjs
import { cached, labels, set } from './lib.mjs'

const inSet = new Set(set().map((r) => r.sciName))
const HONEST = new Set(['several', 'cannot tell', 'outside the set'])
const binomials = (s) => [...s.matchAll(/\b([A-Z][a-z]+) ([a-z]+)\b/g)].map((m) => `${m[1]} ${m[2]}`)
const genera = (s) => [...new Set([...s.matchAll(/\b([A-Z][a-z]+)\b/g)].map((m) => m[1]).filter((g) => !['Bonsai', 'Fruit'].includes(g)))]

/**
 * ✅ species in the guess, or the honest answer the guess expects ("several", "no" → outside the set)
 * 🟡 genus in the guess (answer at genus rank, or a sibling species)
 * ⬜ honest "cannot tell" / "several" / "outside the set" where the guess names something
 * 🔸 wrong, but hedged (confidence < 0.5)
 * ❌ wrong and confident (≥ 0.5)
 */
function grade(l, answer, conf) {
  if (!answer) return { g: '⬜', why: 'no answer' }
  const a = answer.replace(/\s+sp\.?$/, '').trim()
  const guessSpecies = binomials(l.guess), guessGenera = genera(l.guess)
  const expectSeveral = /^several/.test(l.guess) || l.inSet === 'several'
  if (HONEST.has(a)) {
    if (a === 'several' && expectSeveral) return { g: '✅', why: 'several, as expected' }
    if (a === 'outside the set' && l.inSet === 'no') return { g: '✅', why: 'outside the set, as expected' }
    return { g: '⬜', why: a }
  }
  const [ag, as] = a.split(' ')
  if (!as && /(aceae|idae)$/.test(ag)) return { g: '⬜', why: `family ${ag}` } // stopped at the family: honest, not a hit
  if (as && guessSpecies.includes(a)) return { g: '✅', why: a }
  if (guessGenera.includes(ag)) return { g: '🟡', why: as ? `${a}, guess ${l.guess}` : `genus ${ag}` }
  if (!as && guessSpecies.some((s) => s.split(' ')[0] === ag)) return { g: '🟡', why: `genus ${ag}` }
  return conf >= 0.5 ? { g: '❌', why: `${a} @${conf}` } : { g: '🔸', why: `${a} @${conf}` }
}

const PRICE = { 'claude-sonnet-5': { in: 2, cw: 2.5, cr: 0.2, out: 10 }, 'claude-opus-5': { in: 5, cw: 6.25, cr: 0.5, out: 25 } } // USD per MTok, platform.claude.com/docs/en/about-claude/pricing, 2026-09-06
const cents = (m, u) => u ? ((u.input_tokens * PRICE[m].in + (u.cache_creation_input_tokens ?? 0) * PRICE[m].cw + (u.cache_read_input_tokens ?? 0) * PRICE[m].cr + u.output_tokens * PRICE[m].out) / 1e6) * 100 : 0

const cols = [
  ['Pl@ntNet auto', (n) => { const r = cached(`plantnet-auto-${n}`)?.body.results?.[0]; return r && { a: r.species.scientificNameWithoutAuthor, c: +r.score.toFixed(2) } }],
  ['Pl@ntNet organ', (n, l) => { const r = cached(`plantnet-${ORGANS[n]}-${n}`)?.body.results?.[0]; return r && { a: r.species.scientificNameWithoutAuthor, c: +r.score.toFixed(2) } }],
  ['Pl@ntNet ∩ set ≥ 0.1', (n) => { const r = cached(`plantnet-auto-${n}`)?.body.results?.find((x) => inSet.has(x.species.scientificNameWithoutAuthor) && x.score >= 0.1); return r ? { a: r.species.scientificNameWithoutAuthor, c: +r.score.toFixed(2) } : { a: 'outside the set', c: '(no set member ≥ 0.1 in top-5)' } }],
  ['Claude free', (n) => { const j = cached(`claude-claude-sonnet-5-free-${n}`)?.json; return j && { a: j.answer, c: j.confidence } }],
  ['Claude set', (n) => { const j = cached(`claude-claude-sonnet-5-set-${n}`)?.json; return j && { a: j.answer, c: j.confidence } }],
  ['Opus free', (n) => { const j = cached(`claude-claude-opus-5-free-${n}`)?.json; return j ? { a: j.answer, c: j.confidence } : null }],
  // 0015b: BioCLIP 2 on the Mac. A = open set (867 455 ToL names), B = the 929 as labels, C = B + 149 distractors; a distractor at
  // top-1 in C is the engine saying "outside the set", so it is scored as that honest answer with the distractor in brackets
  ['BioCLIP ToL', (n) => { const t = cached(`bioclip-A-${n}`)?.top?.[0]; return t && { a: t.sci, c: +t.score.toFixed(2) } }],
  ['BioCLIP set', (n) => { const t = cached(`bioclip-B-${n}`)?.top?.[0]; return t && { a: t.sci, c: +t.score.toFixed(2) } }],
  ['BioCLIP set+distr.', (n) => { const t = cached(`bioclip-C-${n}`)?.top?.[0]; return t && (t.inSet ? { a: t.sci, c: +t.score.toFixed(2) } : { a: 'outside the set', c: `(${t.sci} ${t.score.toFixed(2)})` }) }],
]
import { ORGAN as ORGANS } from './lib.mjs'

const tally = {}
const lines = [`| # | Photo · agent's guess | ${cols.map((c) => c[0]).join(' | ')} |`, `| --- | --- | ${cols.map(() => '---').join(' | ')} |`]
for (const l of labels()) {
  const n = Number(l.n)
  const cells = cols.map(([name, f]) => {
    const r = f(n, l)
    if (!r) return '—'
    const { g } = grade(l, r.a, r.c)
    tally[name] ??= {}; tally[name][g] = (tally[name][g] ?? 0) + 1
    return `${g} ${r.a} ${r.c}`
  })
  lines.push(`| ${n} | ${l.file.replace(/\.(PNG|jpg)$/, '').replace('PHOTO-2026-09-06-19-29-', 'PHOTO …-')} · ${l.guess} | ${cells.join(' | ')} |`)
}
lines.push(`| | **Tally** | ${cols.map(([name]) => ['✅', '🟡', '⬜', '🔸', '❌'].map((g) => `${g}${tally[name]?.[g] ?? 0}`).join(' ')).join(' | ')} |`)
console.log(lines.join('\n'))

// Cost and latency
console.log('\n| Engine · run | Calls | Median s | Max s | Tokens in / cache write / cache read / out | Cost | Per photo |\n| --- | --- | --- | --- | --- | --- | --- |')
const stat = (name, rs, extra) => {
  const ms = rs.map((r) => r.ms).sort((a, b) => a - b)
  const med = ms[Math.floor(ms.length / 2)] / 1000
  const fmt = (s) => (s < 0.2 ? s.toFixed(3) : s.toFixed(1)) // BioCLIP is 30–130 ms, one decimal would print 0.0
  console.log(`| ${name} | ${rs.length} | ${fmt(med)} | ${fmt(ms.at(-1) / 1000)} | ${extra(rs)} |`)
}
for (const run of ['auto', 'organ']) {
  const rs = labels().map((l) => cached(`plantnet-${run === 'auto' ? 'auto' : ORGANS[l.n]}-${l.n}`))
  stat(`Pl@ntNet ${run}`, rs, () => '— | 0 ¢ (free tier, 500/day; 499 → 463 left after 36 calls) | 0 ¢')
}
const bio = cached('bioclip')?.runs ?? {}
for (const [run, name] of [['A', 'BioCLIP 2 ToL · MPS'], ['B', 'BioCLIP 2 set · MPS'], ['C', 'BioCLIP 2 set+distr. · MPS'], ['Bcpu', 'BioCLIP 2 set · CPU 12 threads'], ['Bcpu2', 'BioCLIP 2 set · CPU 2 threads']]) {
  const rs = labels().map((l) => cached(`bioclip-${run}-${l.n}`)).filter(Boolean)
  if (rs.length) stat(name, rs, () => `— (${bio[run]?.labels ?? '?'} labels, warm load ${((bio[run]?.load_ms ?? 0) / 1000).toFixed(1)} s) | 0 ¢ (local, MIT) | 0 ¢`)
}
for (const [m, p] of [['claude-sonnet-5', 'free'], ['claude-sonnet-5', 'set'], ['claude-opus-5', 'free']]) {
  const rs = labels().map((l) => cached(`claude-${m}-${p}-${l.n}`)).filter(Boolean)
  stat(`${m} ${p}`, rs, (rs) => {
    const s = rs.reduce((a, r) => ({ i: a.i + r.usage.input_tokens, cw: a.cw + (r.usage.cache_creation_input_tokens ?? 0), cr: a.cr + (r.usage.cache_read_input_tokens ?? 0), o: a.o + r.usage.output_tokens }), { i: 0, cw: 0, cr: 0, o: 0 })
    const c = rs.reduce((a, r) => a + cents(m, r.usage), 0)
    return `${s.i} / ${s.cw} / ${s.cr} / ${s.o} | ${c.toFixed(1)} ¢ | ${(c / rs.length).toFixed(2)} ¢`
  })
}

// 0015b step 5: the softmax margin (top-1 − top-2) against the grade, runs B and C. Which threshold for "unsicher"?
console.log('\n| Run | Photo | Margin | Grade | Top-1 · top-2 |\n| --- | --- | --- | --- | --- |')
const margins = {}
for (const run of ['B', 'C']) {
  for (const l of labels()) {
    const r = cached(`bioclip-${run}-${l.n}`); if (!r) continue
    const t = r.top[0]
    const { g } = grade(l, t.inSet ? t.sci : 'outside the set', t.score)
    ;(margins[run] ??= []).push({ n: +l.n, m: r.margin, g, t1: `${t.sci} ${t.score.toFixed(2)}`, t2: `${r.top[1].sci} ${r.top[1].score.toFixed(2)}` })
  }
  for (const x of margins[run].sort((a, b) => a.m - b.m)) console.log(`| ${run} | ${x.n} | ${x.m.toFixed(3)} | ${x.g} | ${x.t1} · ${x.t2} |`)
}
console.log('\n| Threshold | Run | Shown (margin ≥ t) | Suppressed → "unsicher" |\n| --- | --- | --- | --- |')
const glyphs = (xs) => ['✅', '🟡', '⬜', '🔸', '❌'].map((g) => `${g}${xs.filter((x) => x.g === g).length}`).filter((s) => !s.endsWith('0')).join(' ') || '—'
for (const t of [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5]) for (const run of ['B', 'C']) {
  const xs = margins[run] ?? []
  console.log(`| ${t} | ${run} | ${glyphs(xs.filter((x) => x.m >= t))} | ${glyphs(xs.filter((x) => x.m < t))} |`)
}
