import { beforeEach, describe, expect, it } from "vitest"

import { getCartProducts } from "@/lib/cart/queries"
import { prisma } from "@/lib/db/client"
import { placeOrder } from "@/lib/orders/place"
import {
  createCardOrder,
  createSavedAddress,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import type { Admin } from "./order-actions"
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "./product-changes"
import type { ProductInput } from "./product-validations"

let admin: Admin

beforeEach(async () => {
  await resetDb()
  const user = await createUser({
    name: "Ada Admin",
    email: "admin@example.com",
  })
  admin = {
    id: user.id,
    name: user.name,
    email: user.email,
  }
})

const tee = (
  over: Partial<ProductInput> = {}
): ProductInput => ({
  name: "Classic Tee",
  description: "A soft cotton tee.",
  price: "24.99",
  category: "MEN",
  type: "T_SHIRTS",
  bestSeller: false,
  sizes: [
    { label: "S", stock: 5, expectedStock: null },
    { label: "M", stock: 10, expectedStock: null },
  ],
  colors: [{ name: "White", hex: "#ffffff" }],
  ...over,
})

/** The form for an existing product, as the edit page builds it: each size expects the stock it has now. */
async function formFor(
  id: string,
  over: Partial<ProductInput> = {}
): Promise<ProductInput> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: {
      sizes: { orderBy: { position: "asc" } },
      colors: true,
    },
  })
  return {
    name: product.name,
    description: product.description,
    price: `${Math.floor(product.priceCents / 100)}.${String(product.priceCents % 100).padStart(2, "0")}`,
    category: product.category,
    type: product.type,
    bestSeller: product.bestSeller,
    sizes: product.sizes.map((s) => ({
      label: s.label,
      stock: s.stock,
      expectedStock: s.stock,
    })),
    colors: product.colors.map(({ name, hex }) => ({
      name,
      hex,
    })),
    ...over,
  }
}

const created = async (over: Partial<ProductInput> = {}) =>
  (await createProduct(admin, tee(over))).id
const stock = async (id: string, label: string) =>
  (
    await prisma.productSize.findFirstOrThrow({
      where: { productId: id, label },
    })
  ).stock
const audits = (action?: string) =>
  prisma.auditLog.findMany({
    where: action ? { action } : {},
    orderBy: { createdAt: "asc" },
  })

describe("createProduct", () => {
  it("saves the product with its sizes in order and its colors, in cents", async () => {
    const id = await created({ price: "19.99" })

    const product = await prisma.product.findUniqueOrThrow({
      where: { id },
      include: {
        sizes: { orderBy: { position: "asc" } },
        colors: true,
      },
    })
    expect(product).toMatchObject({
      name: "Classic Tee",
      priceCents: 1999,
      category: "MEN",
      type: "T_SHIRTS",
      bestSeller: false,
    })
    expect(
      product.sizes.map((s) => [
        s.label,
        s.stock,
        s.position,
      ])
    ).toEqual([
      ["S", 5, 0],
      ["M", 10, 1],
    ])
    expect(product.colors).toMatchObject([
      { name: "White", hex: "#ffffff" },
    ])
  })

  it("records it, naming the admin, the price and the sizes", async () => {
    const id = await created()

    const [entry, ...rest] = await audits()
    expect(rest).toHaveLength(0)
    expect(entry).toMatchObject({
      action: "product.create",
      targetType: "product",
      targetId: id,
      actorLabel: "Ada Admin <admin@example.com>",
    })
    expect(entry.summary).toBe(
      '"Classic Tee" was added at $24.99 with sizes S, M'
    )
  })
})

describe("updateProduct", () => {
  it("saves the changes and says exactly what changed", async () => {
    const id = await created()

    const result = await updateProduct(
      admin,
      id,
      await formFor(id, {
        name: "Classic Tee 2",
        price: "26.99",
        category: "WOMEN",
        bestSeller: true,
        description: "Softer.",
      })
    )

    expect(result).toEqual({ ok: true, id, changed: true })
    const [, entry] = await audits()
    expect(entry.action).toBe("product.update")
    for (const part of [
      '"Classic Tee 2"',
      'renamed from "Classic Tee"',
      "price $24.99 → $26.99",
      "category Men → Women",
      "made a best seller",
      "description changed",
    ]) {
      expect(entry.summary).toContain(part)
    }
  })

  it("writes nothing when nothing changed", async () => {
    const id = await created()

    expect(
      await updateProduct(admin, id, await formFor(id))
    ).toEqual({
      ok: true,
      id,
      changed: false,
    })
    expect(await audits("product.update")).toHaveLength(0)
  })

  it("adds, removes and reorders sizes, keeping the ones that stay", async () => {
    const id = await created()
    const before = await prisma.productSize.findMany({
      where: { productId: id },
    })
    const m = before.find((s) => s.label === "M")!

    await updateProduct(
      admin,
      id,
      await formFor(id, {
        sizes: [
          { label: "M", stock: 10, expectedStock: 10 },
          { label: "L", stock: 4, expectedStock: null },
        ],
      })
    )

    const after = await prisma.productSize.findMany({
      where: { productId: id },
      orderBy: { position: "asc" },
    })
    expect(
      after.map((s) => [s.label, s.stock, s.position])
    ).toEqual([
      ["M", 10, 0],
      ["L", 4, 1],
    ])
    // M is the same row, not a new one
    expect(after[0].id).toBe(m.id)
    const summary = (await audits("product.update"))[0]
      .summary
    expect(summary).toContain(
      "size L added with 4 in stock"
    )
    expect(summary).toContain("size S removed")
  })

  it("changes the colors only when they changed", async () => {
    const id = await created()

    await updateProduct(
      admin,
      id,
      await formFor(id, {
        colors: [{ name: "WHITE", hex: "#FFFFFF" }],
      })
    )
    expect(await audits("product.update")).toHaveLength(0)

    await updateProduct(
      admin,
      id,
      await formFor(id, {
        colors: [{ name: "Navy", hex: "#001f3f" }],
      })
    )
    expect(
      (await audits("product.update"))[0].summary
    ).toContain("colors changed")
    expect(
      (
        await prisma.productColor.findMany({
          where: { productId: id },
        })
      ).map((c) => c.name)
    ).toEqual(["Navy"])
  })

  it("is not found for a product that does not exist", async () => {
    expect(
      await updateProduct(admin, "no-such-product", tee())
    ).toEqual({
      ok: false,
      reason: "not-found",
    })
  })
})

describe("stock", () => {
  it("is set when the admin changed it and nobody else has", async () => {
    const id = await created()
    const form = await formFor(id)
    form.sizes[1] = {
      label: "M",
      stock: 25,
      expectedStock: 10,
    }

    expect(
      await updateProduct(admin, id, form)
    ).toMatchObject({ ok: true, changed: true })

    expect(await stock(id, "M")).toBe(25)
    expect(
      (await audits("product.update"))[0].summary
    ).toContain("stock of M 10 → 25")
  })

  it("is never overwritten by an old form when the admin did not touch it", async () => {
    const id = await created()
    const stale = await formFor(id) // the page, loaded when M had 10
    // a customer buys 3 while the page is open
    const user = await createUser()
    const address = await createSavedAddress(user.id)
    await placeOrder({
      userId: user.id,
      addressId: address.id,
      idempotencyKey: crypto.randomUUID(),
      items: [{ productId: id, size: "M", quantity: 3 }],
    })
    expect(await stock(id, "M")).toBe(7)

    // the admin only renames the product
    await updateProduct(admin, id, {
      ...stale,
      name: "Renamed Tee",
    })

    expect(await stock(id, "M")).toBe(7)
    expect(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id },
        })
      ).name
    ).toBe("Renamed Tee")
  })

  it("refuses to set a number the admin chose from a stock that has since changed, and saves nothing", async () => {
    const id = await created()
    const stale = await formFor(id)
    await prisma.productSize.updateMany({
      where: { productId: id, label: "M" },
      data: { stock: 7 },
    })
    stale.sizes[1] = {
      label: "M",
      stock: 20,
      expectedStock: 10,
    }

    const result = await updateProduct(admin, id, {
      ...stale,
      name: "Renamed Tee",
    })

    expect(result).toEqual({
      ok: false,
      reason: "stock-changed",
      sizes: ["M"],
    })
    expect(await stock(id, "M")).toBe(7)
    // nothing from the same save was kept either
    expect(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id },
        })
      ).name
    ).toBe("Classic Tee")
    expect(await audits("product.update")).toHaveLength(0)
  })

  it("lets only one of two admins who both changed the same stock win", async () => {
    const id = await created()
    const a = await formFor(id)
    const b = await formFor(id)
    a.sizes[1] = {
      label: "M",
      stock: 20,
      expectedStock: 10,
    }
    b.sizes[1] = {
      label: "M",
      stock: 30,
      expectedStock: 10,
    }

    const results = await Promise.all([
      updateProduct(admin, id, a),
      updateProduct(admin, id, b),
    ])

    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(
      results.filter(
        (r) => !r.ok && r.reason === "stock-changed"
      )
    ).toHaveLength(1)
    expect([20, 30]).toContain(await stock(id, "M"))
  })

  it("ends consistent when a sale and an admin's change happen together", async () => {
    const id = await created()
    const user = await createUser()
    const address = await createSavedAddress(user.id)
    const form = await formFor(id)
    form.sizes[1] = {
      label: "M",
      stock: 20,
      expectedStock: 10,
    }

    const [, saved] = await Promise.all([
      placeOrder({
        userId: user.id,
        addressId: address.id,
        idempotencyKey: crypto.randomUUID(),
        items: [{ productId: id, size: "M", quantity: 3 }],
      }),
      updateProduct(admin, id, form),
    ])

    // either the sale came first and the admin was told (7), or the admin came first (20 - 3)
    expect(await stock(id, "M")).toBe(saved.ok ? 17 : 7)
  })
})

describe("deleteProduct", () => {
  it("removes the product, its sizes and colors, and records it", async () => {
    const id = await created()

    expect(await deleteProduct(admin, id)).toEqual({
      ok: true,
    })

    expect(await prisma.product.count()).toBe(0)
    expect(await prisma.productSize.count()).toBe(0)
    expect(await prisma.productColor.count()).toBe(0)
    expect(
      (await audits("product.delete"))[0].summary
    ).toBe('"Classic Tee" ($24.99, 2 sizes) was deleted')
  })

  it("leaves orders already placed untouched, and carts see it as gone", async () => {
    const { order, product } = await createCardOrder(2)

    await deleteProduct(admin, product.id)

    const item = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
    })
    expect(item).toMatchObject({
      productId: null,
      quantity: 2,
      unitPriceCents: 2000,
    })
    expect(item.name).toBe(product.name)
    expect(
      await getCartProducts([
        { productId: product.id, size: "M" },
      ])
    ).toEqual([])
  })

  it("deletes once when admins delete together, and says so for a missing product", async () => {
    const id = await created()

    const results = await Promise.all([
      deleteProduct(admin, id),
      deleteProduct(admin, id),
      deleteProduct(admin, id),
    ])

    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(await audits("product.delete")).toHaveLength(1)
    expect(await deleteProduct(admin, id)).toEqual({
      ok: false,
      reason: "not-found",
    })
  })
})
