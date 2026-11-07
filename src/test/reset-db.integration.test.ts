import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest"

import { prisma } from "@/lib/db/client"

import { resetDb } from "./reset-db"

// There are no models yet, so the helper is exercised on a throwaway table.
describe("resetDb", () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS reset_probe (id serial PRIMARY KEY)`
    )
  })

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      `DROP TABLE IF EXISTS reset_probe`
    )
  })

  it("empties tables and restarts their identity counters", async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO reset_probe DEFAULT VALUES`
    )
    await prisma.$executeRawUnsafe(
      `INSERT INTO reset_probe DEFAULT VALUES`
    )

    await resetDb()

    const rows = await prisma.$queryRawUnsafe<
      { id: number }[]
    >(`INSERT INTO reset_probe DEFAULT VALUES RETURNING id`)
    expect(rows[0]?.id).toBe(1)
  })
})
