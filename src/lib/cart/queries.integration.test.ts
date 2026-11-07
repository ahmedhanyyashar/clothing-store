import { beforeEach, describe, expect, it } from "vitest"

import { createProduct } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { getCartProducts } from "./queries"

beforeEach(resetDb)

describe("getCartProducts", () => {
  it("returns the current price, image and stock of each product and size", async () => {
    const tee = await createProduct({
      name: "Tee",
      priceCents: 1999,
      images: [
        "/products/tee.webp",
        "/products/tee-2.webp",
      ],
      sizes: [
        { label: "S", stock: 4 },
        { label: "M", stock: 0 },
      ],
    })

    const found = await getCartProducts([
      { productId: tee.id, size: "S" },
      { productId: tee.id, size: "M" },
    ])

    expect(found).toHaveLength(2)
    expect(found).toContainEqual({
      productId: tee.id,
      size: "S",
      name: "Tee",
      priceCents: 1999,
      imageUrl: "/products/tee.webp",
      stock: 4,
    })
    expect(found).toContainEqual(
      expect.objectContaining({ size: "M", stock: 0 })
    )
  })

  it("leaves out a product or size that does not exist", async () => {
    const tee = await createProduct()

    const found = await getCartProducts([
      { productId: tee.id, size: "XXL" },
      { productId: "no-such-product", size: "M" },
    ])

    expect(found).toEqual([])
  })

  it("returns only the pairs asked for, not the product's other sizes", async () => {
    const tee = await createProduct({
      sizes: [
        { label: "S", stock: 1 },
        { label: "M", stock: 1 },
      ],
    })

    const found = await getCartProducts([
      { productId: tee.id, size: "S" },
    ])

    expect(found.map((p) => p.size)).toEqual(["S"])
  })

  it("answers an empty cart without querying", async () => {
    expect(await getCartProducts([])).toEqual([])
  })
})
