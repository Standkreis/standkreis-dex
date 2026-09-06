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
  console.log(`| ${name} | ${rs.length} | ${med.toFixed(1)} | ${(ms.at(-1) / 1000).toFixed(1)} | ${extra(rs)} |`)
}
for (const run of ['auto', 'organ']) {
  const rs = labels().map((l) => cached(`plantnet-${run === 'auto' ? 'auto' : ORGANS[l.n]}-${l.n}`))
  stat(`Pl@ntNet ${run}`, rs, () => '— | 0 ¢ (free tier, 500/day; 499 → 463 left after 36 calls) | 0 ¢')
}
for (const [m, p] of [['claude-sonnet-5', 'free'], ['claude-sonnet-5', 'set'], ['claude-opus-5', 'free']]) {
  const rs = labels().map((l) => cached(`claude-${m}-${p}-${l.n}`)).filter(Boolean)
  stat(`${m} ${p}`, rs, (rs) => {
    const s = rs.reduce((a, r) => ({ i: a.i + r.usage.input_tokens, cw: a.cw + (r.usage.cache_creation_input_tokens ?? 0), cr: a.cr + (r.usage.cache_read_input_tokens ?? 0), o: a.o + r.usage.output_tokens }), { i: 0, cw: 0, cr: 0, o: 0 })
    const c = rs.reduce((a, r) => a + cents(m, r.usage), 0)
    return `${s.i} / ${s.cw} / ${s.cr} / ${s.o} | ${c.toFixed(1)} ¢ | ${(c / rs.length).toFixed(2)} ¢`
  })
}
