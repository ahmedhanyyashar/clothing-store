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
      category: undefined,
      type: undefined,
      q: "",
      sort: "newest",
      page: 1,
    })
  })

  it("reads filters by their slugs", () => {
    expect(
      parse(
        "category=women&type=t-shirts&sort=price-asc&page=3&q=tee"
      )
    ).toEqual({
      category: "WOMEN",
      type: "T_SHIRTS",
      q: "tee",
      sort: "price-asc",
      page: 3,
    })
  })

  it("drops values it does not know instead of failing", () => {
    const query = parse(
      "category=pets&type=capes&sort=cheapest&page=abc"
    )

    expect(query).toMatchObject({
      category: undefined,
      type: undefined,
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
