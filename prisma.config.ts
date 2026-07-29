import "dotenv/config";
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
  datasource: {
    // Schema changes (db push / migrate) need a direct connection — Supabase's
    // transaction pooler on port 6543 cannot run DDL. Falls back to
    // DATABASE_URL so `prisma generate` still works during a Vercel build,
    // where only DATABASE_URL is required.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
})
