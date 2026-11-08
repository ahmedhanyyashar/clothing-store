import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import { createProduct as makeProduct } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  getAdminProduct,
  listAdminProducts,
} from "./product-queries"

beforeEach(resetDb)

describe("listAdminProducts", () => {
  it("lists the newest first and pages without losing or repeating a product", async () => {
    const total = ADMIN_PRODUCTS_PAGE_SIZE + 4
    const base = Date.now() - total * 1000
    for (let i = 0; i < total; i++) {
      // two products share a time, which the id must break
      await makeProduct({
        name: `Product ${String(i).padStart(2, "0")}`,
        createdAt: new Date(
          base + Math.floor(i / 2) * 1000
        ),
      })
    }

    const first = await listAdminProducts({ page: 1 })
    const second = await listAdminProducts({ page: 2 })

    expect(first).toMatchObject({ total, pageCount: 2 })
    expect(first.products).toHaveLength(
      ADMIN_PRODUCTS_PAGE_SIZE
    )
    expect(second.products).toHaveLength(4)
    const ids = [...first.products, ...second.products].map(
      (p) => p.id
    )
    expect(new Set(ids).size).toBe(total)
  })

  it("searches by part of the name, ignoring case, and treats % and _ as plain characters", async () => {
    await makeProduct({ name: "100% Cotton Tee" })
    await makeProduct({ name: "Denim Jacket" })
    await makeProduct({ name: "Plain Tee" })

    expect(
      (await listAdminProducts({ q: "tee", page: 1 })).total
    ).toBe(2)
    expect(
      (await listAdminProducts({ q: "100%", page: 1 }))
        .total
    ).toBe(1)
    expect(
      (await listAdminProducts({ q: "%", page: 1 })).total
    ).toBe(1)
    expect(
      (await listAdminProducts({ q: "_", page: 1 })).total
    ).toBe(0)
  })

  it("gives the first photo and the sizes' stock for each product", async () => {
    await makeProduct({
      images: [
        "/products/front.webp",
        "/products/back.webp",
      ],
      sizes: [
        { label: "S", stock: 2 },
        { label: "M", stock: 3 },
      ],
    })

    const [product] = (await listAdminProducts({ page: 1 }))
      .products

    expect(product.images).toEqual([
      { url: "/products/front.webp" },
    ])
    expect(
      product.sizes.reduce((sum, s) => sum + s.stock, 0)
    ).toBe(5)
  })

  it("shows a product that has no photo", async () => {
    await makeProduct({ images: [] })

    const [product] = (await listAdminProducts({ page: 1 }))
      .products

    expect(product.images).toEqual([])
  })
})

describe("getAdminProduct", () => {
  it("returns the product with its sizes in order, its colors and its photos", async () => {
    const product = await makeProduct({
      sizes: [
        { label: "L", stock: 1 },
        { label: "S", stock: 2 },
      ],
      colors: [{ name: "Navy", hex: "#001f3f" }],
    })

    const found = await getAdminProduct(product.id)

    expect(found?.sizes.map((s) => s.label)).toEqual([
      "L",
      "S",
    ])
    expect(found?.colors).toMatchObject([{ name: "Navy" }])
    expect(found?.images).toHaveLength(1)
  })

  it("is null for a product that does not exist", async () => {
    expect(
      await getAdminProduct("no-such-product")
    ).toBeNull()
    expect(await prisma.product.count()).toBe(0)
  })
})
