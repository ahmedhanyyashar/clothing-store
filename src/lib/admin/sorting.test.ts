import { describe, expect, it } from "vitest"

import { nextDirection, parseSort } from "./sorting"

const COLUMNS = ["name", "price", "created"] as const
const fallback = { key: "created", dir: "desc" } as const

describe("parseSort", () => {
  it("uses the default order when nothing is asked for", () => {
    expect(parseSort({}, COLUMNS, fallback)).toEqual(
      fallback
    )
  })

  it("reads a column and a direction", () => {
    expect(
      parseSort(
        { sort: "price", dir: "desc" },
        COLUMNS,
        fallback
      )
    ).toEqual({ key: "price", dir: "desc" })
  })

  it("starts a column the visitor chose in ascending order, but keeps the default column's own order", () => {
    expect(
      parseSort({ sort: "name" }, COLUMNS, fallback)
    ).toEqual({ key: "name", dir: "asc" })
    expect(
      parseSort({ sort: "created" }, COLUMNS, fallback)
    ).toEqual({ key: "created", dir: "desc" })
  })

  it("ignores a column that is not on the list, however it is spelled", () => {
    for (const sort of [
      "password",
      "price; drop table product",
      "PRICE",
      "",
      "__proto__",
    ])
      expect(
        parseSort({ sort, dir: "asc" }, COLUMNS, fallback)
      ).toEqual(fallback)
  })

  it("ignores a direction that is not asc or desc", () => {
    expect(
      parseSort(
        { sort: "price", dir: "sideways" },
        COLUMNS,
        fallback
      )
    ).toEqual({ key: "price", dir: "asc" })
  })
})

describe("nextDirection", () => {
  it("reverses the current column and starts any other ascending", () => {
    expect(
      nextDirection({ key: "name", dir: "asc" }, "name")
    ).toBe("desc")
    expect(
      nextDirection({ key: "name", dir: "desc" }, "name")
    ).toBe("asc")
    expect(
      nextDirection({ key: "name", dir: "desc" }, "price")
    ).toBe("asc")
  })
})
