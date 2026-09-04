import { defineConfig } from 'prisma/config'

// The dev database is the one docker-compose.yml starts. Set DATABASE_URL to point anywhere else.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex' },
})
