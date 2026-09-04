import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

// One dev identity and nothing else (handoff 0004). Species data comes from the ETL (M4).
export const DEV_IDENTITY_ID = '00000000-0000-4000-8000-000000000001'

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex' }) })
  await prisma.identity.upsert({ where: { id: DEV_IDENTITY_ID }, update: {}, create: { id: DEV_IDENTITY_ID, displayName: 'dev' } })
  console.log(`seeded identity ${DEV_IDENTITY_ID}`)
  await prisma.$disconnect()
}
main()
