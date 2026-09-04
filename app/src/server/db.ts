import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const url = process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex'
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// One client per process; in dev the module is re-evaluated on every edit, so it is cached on globalThis.
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
