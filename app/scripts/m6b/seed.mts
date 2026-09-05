// The C8 fixture of handoff 0008 Track B on a dedicated test identity: three days, one repeat, one study, one captive row,
// two rows with an own photo, points and Gemeinde places, notes. Dates are relative to now so "Heute" and "Gestern" show.
// usage: npx tsx scripts/m6b/seed.mts seed | show | cleanup
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex' }) })
export const IDENTITY = '00000000-0000-4000-8000-00000000006b'

const day = (ago: number, h: number, m: number) => { const d = new Date(); d.setDate(d.getDate() - ago); d.setHours(h, m, 0, 0); return d }
const BINGEN = { place: 'Bingen am Rhein', lat: 49.9668, lng: 7.8992 }
const INGELHEIM = { place: 'Ingelheim am Rhein', lat: 49.9747, lng: 8.0563 }
const WALD = { place: 'Waldalgesheim', lat: 49.9506, lng: 7.8319 }

type Row = { de: string; ago: number; h: number; m: number; where?: typeof BINGEN; note?: string; photo?: boolean; wildness?: 'wild' | 'captive' }
const SIGHTINGS: Row[] = [
  // today: a first (Schlehdorn, the only wild row of its taxon → C9 deletes it), two repeats
  { de: 'Schlehdorn', ago: 0, h: 9, m: 40, where: INGELHEIM, note: 'Erste reife Schlehen am Rheinufer' },
  { de: 'Amsel', ago: 0, h: 9, m: 25, where: INGELHEIM },
  { de: 'Rotkehlchen', ago: 0, h: 8, m: 5, where: BINGEN, note: 'singt schon wieder, Herbstgesang' },
  // yesterday: a first with a photo, a repeat
  { de: 'Kohlmeise', ago: 1, h: 8, m: 10, where: BINGEN, note: 'am Futterhaus', photo: true },
  { de: 'Rotkehlchen', ago: 1, h: 7, m: 55, where: BINGEN },
  // three days ago: the first walk, three firsts, one captive row
  { de: 'Fliegenpilz', ago: 3, h: 15, m: 30, where: WALD, note: 'unter Fichten, drei Stück' },
  { de: 'Admiral', ago: 3, h: 15, m: 5, where: WALD, note: 'auf dem Weg, ließ sich lange ansehen', photo: true },
  { de: 'Rotmilan', ago: 3, h: 14, m: 0, where: INGELHEIM, note: 'Flugschau', wildness: 'captive' },
  { de: 'Rotkehlchen', ago: 3, h: 7, m: 50, where: BINGEN },
  { de: 'Amsel', ago: 3, h: 7, m: 40, where: BINGEN },
]
const STUDIES = [{ de: 'Stieleiche', ago: 1, h: 21, m: 30 }]

const region = () => db.region.findFirstOrThrow({ where: { name: 'Mainz-Bingen' } })
const byName = async (regionId: string, de: string) => {
  const t = await db.taxon.findFirst({ where: { commonNames: { path: ['de'], equals: de }, plausibility: { some: { regionId } } }, include: { assets: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1 } } })
  if (!t) throw new Error(`no set member named ${de}`)
  return t
}

const [cmd = 'seed'] = process.argv.slice(2)
if (cmd === 'seed') {
  const r = await region()
  await db.identity.upsert({ where: { id: IDENTITY }, update: { displayName: 'm6b' }, create: { id: IDENTITY, displayName: 'm6b' } })
  await db.filter.upsert({ where: { identityId: IDENTITY }, update: { regionId: r.id, tiles: [] }, create: { identityId: IDENTITY, regionId: r.id, tiles: [] } })
  await db.sighting.deleteMany({ where: { identityId: IDENTITY } })
  await db.study.deleteMany({ where: { identityId: IDENTITY } })
  await db.asset.deleteMany({ where: { ownerId: IDENTITY } })
  const ids: Record<string, string> = {}
  for (const s of SIGHTINGS) {
    const t = await byName(r.id, s.de)
    const row = await db.sighting.create({
      data: {
        identityId: IDENTITY, taxonId: t.id, at: day(s.ago, s.h, s.m), wildness: s.wildness ?? 'wild', note: s.note ?? null,
        lat: s.where?.lat ?? null, lng: s.where?.lng ?? null, place: s.where?.place ?? null, evidence: s.photo ? 'photographed' : 'claimed',
        // The fixture's "own photo" is the taxon's reference file under a user asset row: Track A's /api/photo is not in this worktree.
        photos: s.photo && t.assets[0] ? { create: { kind: 'image', url: t.assets[0].url, author: 'Du', licence: 'eigenes Foto', sourceUrl: t.assets[0].url, origin: 'user', ownerId: IDENTITY } } : undefined,
      },
    })
    ids[`${s.de}@${s.ago}`] = row.id
  }
  for (const s of STUDIES) {
    const t = await byName(r.id, s.de)
    await db.study.create({ data: { identityId: IDENTITY, taxonId: t.id, at: day(s.ago, s.h, s.m) } })
  }
  console.log(JSON.stringify({ identity: IDENTITY, sightings: SIGHTINGS.length, studies: STUDIES.length, ids }, null, 1))
} else if (cmd === 'show') {
  const rows = await db.sighting.findMany({ where: { identityId: IDENTITY }, orderBy: { at: 'desc' }, include: { taxon: { select: { commonNames: true } }, photos: { select: { id: true } } } })
  for (const s of rows) console.log(s.id, s.at.toISOString(), (s.taxon.commonNames as Record<string, string>).de, s.wildness, s.place ?? '-', s.photos.length ? '📷' : '', s.note ?? '')
  console.log('studies:', await db.study.count({ where: { identityId: IDENTITY } }))
} else if (cmd === 'cleanup') {
  console.log('deleted:', (await db.identity.deleteMany({ where: { id: IDENTITY } })).count)
} else {
  console.log('usage: seed | show | cleanup')
}
await db.$disconnect()
