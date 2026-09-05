// The same Prisma client as the app (src/server/db.ts), built for a CLI process.
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex' }) })
