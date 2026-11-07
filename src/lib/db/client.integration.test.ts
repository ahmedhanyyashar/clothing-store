import { describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"

describe("database connection", () => {
  it("runs a query against the test database", async () => {
    const rows = await prisma.$queryRaw<
      { ok: number }[]
    >`SELECT 1 AS ok`

    expect(rows[0]?.ok).toBe(1)
  })
})
