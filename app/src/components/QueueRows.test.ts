import { describe, expect, it } from 'vitest'
import type { Row } from './Queue'
import { mergeQueued, toJournalRow, type Day } from './QueueRows'

const taxon = { id: 't1', gbifKey: 1, sciName: 'Turdus merula', names: { de: 'Amsel' }, tile: 'bird', lead: null }
const row = (id: string, at: string, extra: Partial<Row> = {}): Row => ({ id, kind: 'sighting', createdAt: 1, attempts: 0, lastError: null, payload: { taxonId: 't1', at, wildness: 'wild', taxon, place: 'Bingen am Rhein', first: true }, ...extra } as Row)
const day = (key: string, rows: Day['rows']): Day => ({ day: key, places: [], rows })
const at = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d }
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('the diary merges the outbox (handoff 0009 Track B)', () => {
  it('a waiting row joins its local day, sorted by time, with the chip and the place', () => {
    const today = key(at(9))
    const server = [day(today, [{ ...toJournalRow(row('s1', at(8).toISOString()))!, queued: undefined }])]
    const out = mergeQueued(server, [row('q1', at(10).toISOString())], 'all')
    expect(out).toHaveLength(1)
    expect(out[0]!.rows.map((r) => r.id)).toEqual(['q1', 's1'])
    expect(out[0]!.rows[0]!.queued).toBe('waiting')
    expect(out[0]!.places).toEqual(['Bingen am Rhein'])
  })
  it('a day the server does not have yet is created and sorted newest first; a dead row says so', () => {
    const yesterday = at(9); yesterday.setDate(yesterday.getDate() - 1)
    const out = mergeQueued([day(key(yesterday), [])], [row('q1', at(10).toISOString(), { dead: true })], 'all')
    expect(out.map((d) => d.day)).toEqual([key(at(10)), key(yesterday)])
    expect(out[0]!.rows[0]!.queued).toBe('dead')
  })
  it('a row that already landed is not shown twice; the pills filter; photo rows are no rows', () => {
    const today = key(at(9))
    const landed = day(today, [{ ...toJournalRow(row('q1', at(8).toISOString()))!, queued: undefined }])
    expect(mergeQueued([landed], [row('q1', at(8).toISOString())], 'all')[0]!.rows).toHaveLength(1)
    expect(mergeQueued([], [row('q1', at(8).toISOString())], 'studied')).toHaveLength(0)
    expect(mergeQueued([], [{ id: 'p', kind: 'photo', payload: {}, blob: new Blob(), createdAt: 1, attempts: 0, lastError: null }], 'all')).toHaveLength(0)
  })
})
