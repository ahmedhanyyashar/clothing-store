import { describe, expect, it, vi } from "vitest"

import { logger } from "@/lib/logger"

import { GET } from "./route"

vi.mock("@/lib/db/client", () => ({
  prisma: {
    $queryRaw: vi.fn().mockRejectedValue(new Error("down")),
  },
}))

describe("GET /api/ready", () => {
  it("reports unavailable, without error details, when the database fails", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => {})

    const response = await GET()

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      status: "unavailable",
    })
  })
})
