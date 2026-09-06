// Shared bits of the ID grill probe (handoff 0015): env from app/.env.local (values never printed), disk cache, the fixture.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const HERE = new URL('.', import.meta.url).pathname
export const WALK = new URL('../../../docs/research/walks/01/', import.meta.url).pathname
export const PREP = join(WALK, 'prep')
export const CACHE = join(HERE, '.cache')
mkdirSync(CACHE, { recursive: true })

/** Reads KEY=value lines of app/.env.local into process.env (no overwrite). Values are never logged. */
export function loadEnv() {
  const f = new URL('../../.env.local', import.meta.url).pathname
  if (!existsSync(f)) return
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
  }
}
export function requireKey(name) {
  loadEnv()
  const v = process.env[name]
  if (!v) { console.error(`missing ${name} in app/.env.local`); process.exit(1) }
  console.log(`${name}: present, ${v.length} chars`)
  return v
}

export const cached = (key) => { const f = join(CACHE, key + '.json'); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null }
export const store = (key, v) => writeFileSync(join(CACHE, key + '.json'), JSON.stringify(v, null, 1))

export function labels() {
  const [head, ...lines] = readFileSync(join(WALK, 'labels.csv'), 'utf8').trim().split('\n')
  const cols = head.split(',')
  return lines.map((l) => {
    const cells = []; let cur = '', q = false
    for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch } else if (ch === '"') q = true; else if (ch === ',') { cells.push(cur); cur = '' } else cur += ch }
    cells.push(cur)
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']))
  })
}
export const set = () => JSON.parse(readFileSync(join(HERE, 'set.json'), 'utf8'))
export const photo = (n) => readFileSync(join(PREP, `${n}.jpg`))

/** Organ hint per fixture photo for Pl@ntNet's second run (handoff §🛠️ step 2). */
export const ORGAN = { 1: 'habit', 2: 'habit', 3: 'habit', 4: 'habit', 5: 'habit', 6: 'habit', 7: 'habit', 8: 'habit', 9: 'habit', 10: 'habit', 11: 'habit', 12: 'habit', 13: 'habit', 14: 'fruit', 15: 'fruit', 16: 'flower', 17: 'habit', 18: 'habit' }
export const MISTY = [1, 2, 3, 4, 5, 6, 7, 8, 11, 18] // the ten distance shots: whole trees, drone oblique
