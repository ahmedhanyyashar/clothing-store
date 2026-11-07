import "dotenv/config"

import { defineConfig } from "prisma/config"

// Only commands that open a connection (migrate, studio) need DATABASE_URL.
// Reading it directly, instead of prisma's env() helper, lets `prisma generate`
// run on a fresh clone and in CI jobs that never touch a database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url: process.env.DATABASE_URL },
})
