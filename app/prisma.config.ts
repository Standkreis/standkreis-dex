import { defineConfig } from 'prisma/config'

// The dev database is the one docker-compose.yml starts. Set DATABASE_URL to point anywhere else.
// Migrate needs a direct connection: through Neon's PgBouncer (DATABASE_URL) the session advisory lock of one build
// stays on a pooled server connection and the next build times out on it (P1002, 2026-09-06). DATABASE_URL_UNPOOLED
// is what the Neon integration sets for exactly this; the app itself keeps the pooled URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex' },
})
