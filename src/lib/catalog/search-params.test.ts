import { describe, expect, it } from "vitest"

import {
  shopSearchParams,
  toShopQuery,
} from "./search-params"

function parse(query: string) {
  const params = Object.fromEntries(
    new URLSearchParams(query)
  )
  return toShopQuery(shopSearchParams.parse(params))
}

describe("the shop URL", () => {
  it("uses sensible defaults for an empty query string", () => {
    expect(parse("")).toEqual({
      categories: [],
      types: [],
      q: "",
      sort: "newest",
      page: 1,
    })
  })

  it("reads several filters of each kind by their slugs", () => {
    expect(
      parse(
        "category=men,women&type=t-shirts,jeans&sort=price-asc&page=3&q=tee"
      )
    ).toEqual({
      categories: ["MEN", "WOMEN"],
      types: ["T_SHIRTS", "JEANS"],
      q: "tee",
      sort: "price-asc",
      page: 3,
    })
  })

  it("drops values it does not know and keeps the rest", () => {
    expect(
      parse("category=men,pets&type=capes")
    ).toMatchObject({
      categories: ["MEN"],
      types: [],
    })
    expect(parse("sort=cheapest&page=abc")).toMatchObject({
      sort: "newest",
      page: 1,
    })
  })

  it("never asks for a page before the first", () => {
    expect(parse("page=0").page).toBe(1)
    expect(parse("page=-4").page).toBe(1)
  })

  it("trims the search text", () => {
    expect(parse("q=%20%20denim%20%20").q).toBe("denim")
  })
})
