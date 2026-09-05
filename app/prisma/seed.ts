import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import type { Tile } from '../src/generated/prisma/enums'
import { SHARE_SCALE, words } from '../etl/rules'

// One dev identity (handoff 0004) and the two probe fixtures as plausibility only (handoff 0006 §❓ "Kyoto in seed?"):
// region, taxon, plausibility and lookalike rows, no content. Content is `npm run etl -- content`, a manual command.
// Every write is an upsert, so the seed can run again on a filled database.
export const DEV_IDENTITY_ID = '00000000-0000-4000-8000-000000000001'

type Fixture = { region: string; gadmGid: string; higher: string; monthTotals: number[]; species: { gbifKey: number; sci: string; tile: Tile; order: string | null; obs: number; sharePerMille: number[] }[] }
const FIXTURES = ['fixture-mainz-bingen.json', 'fixture-kyoto.json']

async function seedFixture(prisma: PrismaClient, file: string) {
  const f: Fixture = JSON.parse(readFileSync(join(__dirname, '..', 'etl', 'fixtures', file), 'utf8'))
  const region = await prisma.region.upsert({
    where: { gadmGid: f.gadmGid },
    create: { gadmGid: f.gadmGid, name: f.region, higher: f.higher, monthTotals: f.monthTotals, status: 'ready', refreshedAt: new Date() },
    update: { name: f.region, higher: f.higher, monthTotals: f.monthTotals, status: 'ready', error: null, refreshedAt: new Date() },
  })
  const idOf = new Map<number, string>()
  for (const s of f.species) {
    const genus = s.sci.split(' ')[0]
    const data = { sciName: s.sci, rank: 'species', tile: s.tile, order: s.order, genus }
    const t = await prisma.taxon.upsert({ where: { gbifKey: s.gbifKey }, create: { gbifKey: s.gbifKey, ...data }, update: data, select: { id: true } })
    idOf.set(s.gbifKey, t.id)
    // The fixture stores per mille with two decimals; the table stores per 100,000 (findings 0006).
    const monthShare = s.sharePerMille.map((x) => Math.round(x * (SHARE_SCALE / 1000)))
    const row = { obs: s.obs, monthShare, peak: Math.max(...monthShare), words: words(monthShare) }
    await prisma.plausibility.upsert({ where: { taxonId_regionId: { taxonId: t.id, regionId: region.id } }, create: { taxonId: t.id, regionId: region.id, ...row }, update: row })
  }
  // Look-alikes: same genus within the set, both directions (record 0002 E10).
  const byGenus = new Map<string, number[]>()
  for (const s of f.species) byGenus.set(s.sci.split(' ')[0], [...(byGenus.get(s.sci.split(' ')[0]) ?? []), s.gbifKey])
  const pairs = [...byGenus.values()].filter((g) => g.length > 1).flatMap((g) => g.flatMap((a) => g.filter((b) => b !== a).map((b) => ({ taxonId: idOf.get(a)!, regionId: region.id, siblingId: idOf.get(b)! }))))
  await prisma.$transaction([prisma.lookalike.deleteMany({ where: { regionId: region.id } }), prisma.lookalike.createMany({ data: pairs })])
  console.log(`seeded ${f.region}: ${f.species.length} taxa, ${pairs.length} lookalike pairs`)
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex' }) })
  await prisma.identity.upsert({ where: { id: DEV_IDENTITY_ID }, update: {}, create: { id: DEV_IDENTITY_ID, displayName: 'dev' } })
  console.log(`seeded identity ${DEV_IDENTITY_ID}`)
  for (const file of FIXTURES) await seedFixture(prisma, file)
  await prisma.$disconnect()
}
main()
