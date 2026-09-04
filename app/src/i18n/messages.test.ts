import { describe, expect, it } from 'vitest'
import de from './de.json'
import en from './en.json'

// S4: de and en carry the same keys. A string that exists in one language only is a bug.
const keysOf = (obj: unknown, prefix = ''): string[] =>
  Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )

describe('locales', () => {
  it('de and en have the same keys', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(de).sort())
  })
})
