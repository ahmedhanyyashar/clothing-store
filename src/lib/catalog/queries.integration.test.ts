import { beforeEach, describe, expect, it } from "vitest"

import { createProduct } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import {
  getBestSellers,
  getLatestProducts,
  getProduct,
  listProducts,
  PAGE_SIZE,
} from "./queries"
import type { ShopQuery } from "./search-params"

const all: ShopQuery = { q: "", sort: "newest", page: 1 }

/** Products created `daysAgo` days ago, so the newest-first order is known. */
function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

describe("listProducts", () => {
  beforeEach(resetDb)

  it("returns the newest products first, one page at a time", async () => {
    for (let day = 0; day < PAGE_SIZE + 2; day++) {
      await createProduct({
        name: `Item ${day}`,
        createdAt: daysAgo(day),
      })
    }

    const first = await listProducts(all)
    const second = await listProducts({ ...all, page: 2 })

    expect(first.total).toBe(PAGE_SIZE + 2)
    expect(first.pageCount).toBe(2)
    expect(first.items).toHaveLength(PAGE_SIZE)
    expect(first.items[0]?.name).toBe("Item 0")
    expect(second.items.map((item) => item.name)).toEqual([
      `Item ${PAGE_SIZE}`,
      `Item ${PAGE_SIZE + 1}`,
    ])
  })

  it("never shows a product on two pages", async () => {
    // identical timestamps: only the tie-break keeps the order stable
    const sameTime = daysAgo(1)
    for (let n = 0; n < PAGE_SIZE + 3; n++) {
      await createProduct({ createdAt: sameTime })
    }

    const ids = [
      ...(await listProducts(all)).items,
      ...(await listProducts({ ...all, page: 2 })).items,
    ].map((item) => item.id)

    expect(new Set(ids).size).toBe(PAGE_SIZE + 3)
  })

  it("filters by category and by type, alone or together", async () => {
    await createProduct({
      name: "Men tee",
      category: "MEN",
      type: "T_SHIRTS",
    })
    await createProduct({
      name: "Men jeans",
      category: "MEN",
      type: "JEANS",
    })
    await createProduct({
      name: "Women tee",
      category: "WOMEN",
      type: "T_SHIRTS",
    })

    const names = async (query: Partial<ShopQuery>) =>
      (await listProducts({ ...all, ...query })).items
        .map((item) => item.name)
        .sort()

    expect(await names({ category: "MEN" })).toEqual([
      "Men jeans",
      "Men tee",
    ])
    expect(await names({ type: "T_SHIRTS" })).toEqual([
      "Men tee",
      "Women tee",
    ])
    expect(
      await names({ category: "MEN", type: "T_SHIRTS" })
    ).toEqual(["Men tee"])
  })

  it("searches names without regard to case", async () => {
    await createProduct({ name: "Classic White Tee" })
    await createProduct({ name: "Denim Jacket" })

    const result = await listProducts({
      ...all,
      q: "dENiM",
    })

    expect(result.items.map((item) => item.name)).toEqual([
      "Denim Jacket",
    ])
  })

  it("treats % and _ in a search as plain characters", async () => {
    await createProduct({ name: "Plain Tee" })
    await createProduct({ name: "100% Cotton Tee" })

    expect(
      (await listProducts({ ...all, q: "%" })).items.map(
        (i) => i.name
      )
    ).toEqual(["100% Cotton Tee"])
    expect(
      (await listProducts({ ...all, q: "_" })).total
    ).toBe(0)
  })

  it("sorts by price in either direction", async () => {
    await createProduct({ name: "Mid", priceCents: 5000 })
    await createProduct({ name: "Cheap", priceCents: 1000 })
    await createProduct({ name: "Dear", priceCents: 9000 })

    const order = async (sort: ShopQuery["sort"]) =>
      (await listProducts({ ...all, sort })).items.map(
        (item) => item.name
      )

    expect(await order("price-asc")).toEqual([
      "Cheap",
      "Mid",
      "Dear",
    ])
    expect(await order("price-desc")).toEqual([
      "Dear",
      "Mid",
      "Cheap",
    ])
  })

  it("returns no items, but a valid page count, past the last page", async () => {
    await createProduct()

    const result = await listProducts({ ...all, page: 9 })

    expect(result.items).toEqual([])
    expect(result.pageCount).toBe(1)
  })

  it("reports a product as in stock only while some size has stock", async () => {
    await createProduct({
      name: "Sold out",
      sizes: [
        { label: "S", stock: 0 },
        { label: "M", stock: 0 },
      ],
    })
    await createProduct({
      name: "Last one",
      sizes: [
        { label: "S", stock: 0 },
        { label: "M", stock: 1 },
      ],
    })

    const stock = Object.fromEntries(
      (await listProducts(all)).items.map((item) => [
        item.name,
        item.inStock,
      ])
    )

    expect(stock).toEqual({
      "Sold out": false,
      "Last one": true,
    })
  })

  it("uses the first image by position as the product's image", async () => {
    await createProduct({
      images: ["/products/a.webp", "/products/b.webp"],
    })

    const { items } = await listProducts(all)

    expect(items[0]?.imageUrl).toBe("/products/a.webp")
  })
})

describe("home page queries", () => {
  beforeEach(resetDb)

  it("returns only best sellers, newest first, up to the limit", async () => {
    await createProduct({
      name: "Old hit",
      bestSeller: true,
      createdAt: daysAgo(5),
    })
    await createProduct({
      name: "New hit",
      bestSeller: true,
      createdAt: daysAgo(1),
    })
    await createProduct({
      name: "Not a hit",
      createdAt: daysAgo(0),
    })

    const hits = await getBestSellers(1)

    expect(hits.map((item) => item.name)).toEqual([
      "New hit",
    ])
  })

  it("returns the latest products regardless of best-seller status", async () => {
    await createProduct({
      name: "Older",
      createdAt: daysAgo(3),
    })
    await createProduct({
      name: "Newer",
      createdAt: daysAgo(1),
    })

    const latest = await getLatestProducts(8)

    expect(latest.map((item) => item.name)).toEqual([
      "Newer",
      "Older",
    ])
  })
})

describe("getProduct", () => {
  beforeEach(resetDb)

  it("returns the details with images and sizes in their set order", async () => {
    const created = await createProduct({
      images: [
        "/products/front.webp",
        "/products/back.webp",
      ],
      sizes: [
        { label: "S", stock: 2 },
        { label: "M", stock: 0 },
        { label: "L", stock: 7 },
      ],
      colors: [{ name: "Navy", hex: "#001f3f" }],
    })

    const product = await getProduct(created.id)

    expect(
      product?.images.map((image) => image.url)
    ).toEqual([
      "/products/front.webp",
      "/products/back.webp",
    ])
    expect(product?.sizes).toEqual([
      { label: "S", stock: 2 },
      { label: "M", stock: 0 },
      { label: "L", stock: 7 },
    ])
    expect(product?.colors).toEqual([
      { name: "Navy", hex: "#001f3f" },
    ])
  })

  it("returns null for an id that does not exist", async () => {
    expect(await getProduct("no-such-product")).toBeNull()
  })
})
