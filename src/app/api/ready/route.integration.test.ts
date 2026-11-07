import { describe, expect, it } from "vitest"

import { GET } from "./route"

describe("GET /api/ready", () => {
  it("reports ok when the database is reachable", async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: "ok" })
  })
})
