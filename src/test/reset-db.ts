import { env } from "@/env"
import { prisma } from "@/lib/db/client"

/** Throws unless the URL points at a database whose name ends in `_test`. */
export function assertTestDatabase(url: string) {
  if (!new URL(url).pathname.endsWith("_test")) {
    throw new Error(
      `refusing to reset a database that is not a test database: ${url}`
    )
  }
}

/**
 * Empties every table in the test database and restarts identity counters.
 * Call it in `beforeEach` of any integration test that writes data. The table
 * list comes from Postgres, so it never needs updating when models are added.
 */
export async function resetDb() {
  assertTestDatabase(env.DATABASE_URL)

  const tables = await prisma.$queryRaw<
    { tablename: string }[]
  >`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `
  if (tables.length === 0) return

  const names = tables
    .map(({ tablename }) => `"${tablename}"`)
    .join(", ")
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`
  )
}
