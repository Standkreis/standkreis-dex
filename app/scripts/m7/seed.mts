// Test data for handoff 0006 C8–C10. Two synthetic taxa (gbifKey ≥ 900000000, tile bird) so nothing collides with the ETL.
// usage: npx tsx scripts/m7/seed.mts sightings <identityId> <n> | studies <identityId> <n> | passkeys <identityId> <n> | show <identityId> | cleanup <identityId…> | cleanup-taxa
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client'

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex' }) })
const KEYS = [900000001, 900000002]

async function taxa() {
  return Promise.all(
    KEYS.map((gbifKey, i) =>
      db.taxon.upsert({ where: { gbifKey }, update: {}, create: { gbifKey, sciName: `Testus avis${i + 1}`, commonNames: { de: `Testvogel ${i + 1}`, en: `Test bird ${i + 1}` }, rank: 'SPECIES', tile: 'bird' } }),
    ),
  )
}

const [cmd, id, nArg] = process.argv.slice(2)
const n = Number(nArg ?? 2)
const base = Date.UTC(2026, 8, 1, 8, 0, 0)

if (cmd === 'sightings') {
  const [a, b] = await taxa()
  for (let i = 0; i < n; i++) {
    const t = i % 2 ? b : a
    await db.sighting.create({ data: { identityId: id, taxonId: t.id, at: new Date(base + i * 3_600_000), place: 'Testort', evidence: 'claimed', wildness: 'wild' } })
  }
  console.log(`+${n} sightings on ${id}`)
} else if (cmd === 'studies') {
  const ts = await taxa()
  for (let i = 0; i < Math.min(n, ts.length); i++) await db.study.upsert({ where: { identityId_taxonId: { identityId: id, taxonId: ts[i].id } }, update: {}, create: { identityId: id, taxonId: ts[i].id } })
  console.log(`+${Math.min(n, ts.length)} studies on ${id}`)
} else if (cmd === 'passkeys') {
  for (let i = 0; i < n; i++) await db.passkey.create({ data: { identityId: id, credentialId: `fake-${id.slice(0, 8)}-${i}`, publicKey: Buffer.from([0]), deviceName: `Fake ${i + 1}` } })
  console.log(`+${n} passkeys on ${id}`)
} else if (cmd === 'show') {
  const row = await db.identity.findUnique({ where: { id }, include: { _count: { select: { sightings: true, studies: true, passkeys: true, assets: true } }, passkeys: { select: { credentialId: true, identityId: true } } } })
  console.log(row ? JSON.stringify({ id: row.id, displayName: row.displayName, ...row._count, passkeys: row.passkeys }) : `identity ${id}: GONE`)
} else if (cmd === 'cleanup') {
  const ids = process.argv.slice(3)
  console.log('identities deleted:', (await db.identity.deleteMany({ where: { id: { in: ids } } })).count)
} else if (cmd === 'cleanup-taxa') {
  console.log('synthetic taxa deleted:', (await db.taxon.deleteMany({ where: { gbifKey: { in: KEYS } } })).count)
} else {
  console.log('usage: sightings|studies|passkeys <identityId> <n> · show <identityId> · cleanup <ids…> · cleanup-taxa')
}
await db.$disconnect()
