import { describe, expect, it } from "vitest"

import { assertTestDatabase } from "./reset-db"

describe("assertTestDatabase", () => {
  it("accepts a database whose name ends in _test", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://root:password@localhost:5433/shop_test"
      )
    ).not.toThrow()
  })

  it("rejects any other database", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://root:password@localhost:5432/shop"
      )
    ).toThrow(/not a test database/)
  })
})
