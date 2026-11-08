import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import {
  createProduct,
  createSavedAddress,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { ORDER_NUMBER_PATTERN } from "./number"
import { placeOrder, type OrderLine } from "./place"
import {
  FREE_SHIPPING_FROM_CENTS,
  SHIPPING_FLAT_CENTS,
} from "./pricing"

let userId: string
let addressId: string

beforeEach(async () => {
  await resetDb()
  userId = (await createUser()).id
  addressId = (await createSavedAddress(userId)).id
})

/** Places an order for `lines` as the test user, with a fresh attempt key by default. */
function place(
  lines: OrderLine[],
  overrides: {
    userId?: string
    addressId?: string
    idempotencyKey?: string
  } = {}
) {
  return placeOrder({
    userId,
    addressId,
    idempotencyKey: crypto.randomUUID(),
    items: lines,
    ...overrides,
  })
}

const stockOf = async (productId: string, size: string) =>
  (
    await prisma.productSize.findFirstOrThrow({
      where: { productId, label: size },
    })
  ).stock

const orderCount = () => prisma.order.count()

describe("placing an order", () => {
  it("stores what was bought, at the price of the moment", async () => {
    const tee = await createProduct({
      name: "Tee",
      priceCents: 2000,
      images: ["/products/tee.webp"],
      sizes: [
        { label: "S", stock: 5 },
        { label: "M", stock: 5 },
      ],
    })

    const result = await place([
      { productId: tee.id, size: "M", quantity: 3 },
    ])

    expect(result).toMatchObject({
      ok: true,
      reused: false,
    })
    const order = await prisma.order.findFirstOrThrow({
      include: { items: true },
    })
    expect(order.number).toMatch(ORDER_NUMBER_PATTERN)
    expect(order).toMatchObject({
      userId,
      status: "PENDING",
      paymentMethod: "CASH_ON_DELIVERY",
      subtotalCents: 6000,
      shippingCents: 500,
      totalCents: 6500,
    })
    expect(order.items).toEqual([
      expect.objectContaining({
        productId: tee.id,
        name: "Tee",
        size: "M",
        imageUrl: "/products/tee.webp",
        unitPriceCents: 2000,
        quantity: 3,
      }),
    ])
  })

  it("takes stock from the size that was bought and no other", async () => {
    const tee = await createProduct({
      sizes: [
        { label: "S", stock: 5 },
        { label: "M", stock: 5 },
      ],
    })

    await place([
      { productId: tee.id, size: "M", quantity: 2 },
    ])

    expect(await stockOf(tee.id, "M")).toBe(3)
    expect(await stockOf(tee.id, "S")).toBe(5)
  })

  it("charges shipping below the threshold and not at or above it", async () => {
    const cheap = await createProduct({
      priceCents: FREE_SHIPPING_FROM_CENTS - 1,
    })
    const exact = await createProduct({
      priceCents: FREE_SHIPPING_FROM_CENTS,
    })

    await place([
      { productId: cheap.id, size: "M", quantity: 1 },
    ])
    await place([
      { productId: exact.id, size: "M", quantity: 1 },
    ])

    const orders = await prisma.order.findMany({
      orderBy: { subtotalCents: "asc" },
    })
    expect(orders.map((o) => o.shippingCents)).toEqual([
      SHIPPING_FLAT_CENTS,
      0,
    ])
    expect(orders.map((o) => o.totalCents)).toEqual([
      FREE_SHIPPING_FROM_CENTS - 1 + SHIPPING_FLAT_CENTS,
      FREE_SHIPPING_FROM_CENTS,
    ])
  })

  it("prices every line from the database, however many there are", async () => {
    const a = await createProduct({ priceCents: 1000 })
    const b = await createProduct({ priceCents: 2500 })

    await place([
      { productId: a.id, size: "M", quantity: 2 },
      { productId: b.id, size: "M", quantity: 1 },
    ])

    const order = await prisma.order.findFirstOrThrow({
      include: { items: true },
    })
    expect(order.items).toHaveLength(2)
    expect(order.subtotalCents).toBe(4500)
  })
})

describe("what an order keeps when other things change", () => {
  it("keeps the address as it was when the saved one is edited or deleted", async () => {
    const tee = await createProduct()
    await place([
      { productId: tee.id, size: "M", quantity: 1 },
    ])

    await prisma.address.update({
      where: { id: addressId },
      data: { line1: "99 Elsewhere Rd", city: "Dallas" },
    })
    await prisma.address.delete({
      where: { id: addressId },
    })

    const order = await prisma.order.findFirstOrThrow()
    expect(order).toMatchObject({
      shipName: "Ada Lovelace",
      shipPhone: "+12025550123",
      shipLine1: "1 Main St",
      shipCity: "Austin",
      shipRegion: "Texas",
      shipPostalCode: "73301",
      shipCountry: "US",
    })
  })

  it("keeps the price paid when the product's price changes", async () => {
    const tee = await createProduct({
      priceCents: 2000,
      name: "Tee",
    })
    await place([
      { productId: tee.id, size: "M", quantity: 1 },
    ])

    await prisma.product.update({
      where: { id: tee.id },
      data: { priceCents: 9999, name: "Renamed" },
    })

    const item = await prisma.orderItem.findFirstOrThrow()
    expect(item).toMatchObject({
      unitPriceCents: 2000,
      name: "Tee",
    })
  })

  it("survives the product being deleted", async () => {
    const tee = await createProduct({ name: "Tee" })
    await place([
      { productId: tee.id, size: "M", quantity: 1 },
    ])

    await prisma.product.delete({ where: { id: tee.id } })

    const item = await prisma.orderItem.findFirstOrThrow()
    expect(item).toMatchObject({
      productId: null,
      name: "Tee",
    })
  })
})

describe("lines that cannot be bought", () => {
  it("reports each problem and changes nothing", async () => {
    const tee = await createProduct({
      sizes: [
        { label: "S", stock: 2 },
        { label: "M", stock: 0 },
        { label: "L", stock: 9 },
      ],
    })

    const result = await place([
      { productId: tee.id, size: "S", quantity: 5 },
      { productId: tee.id, size: "M", quantity: 1 },
      { productId: tee.id, size: "XXL", quantity: 1 },
      {
        productId: "no-such-product",
        size: "M",
        quantity: 1,
      },
      { productId: tee.id, size: "L", quantity: 1 },
    ])

    expect(result).toMatchObject({
      ok: false,
      reason: "problems",
    })
    if (result.ok || result.reason !== "problems") return
    expect(result.problems).toEqual(
      expect.arrayContaining([
        {
          productId: tee.id,
          size: "S",
          code: "insufficient",
          available: 2,
        },
        {
          productId: tee.id,
          size: "M",
          code: "unavailable",
          available: 0,
        },
        {
          productId: tee.id,
          size: "XXL",
          code: "unavailable",
          available: 0,
        },
        {
          productId: "no-such-product",
          size: "M",
          code: "unavailable",
          available: 0,
        },
      ])
    )
    expect(result.problems).toHaveLength(4)
    // the one good line was not bought either
    expect(await stockOf(tee.id, "L")).toBe(9)
    expect(await stockOf(tee.id, "S")).toBe(2)
    expect(await orderCount()).toBe(0)
  })

  it("refuses an address that belongs to someone else", async () => {
    const tee = await createProduct()
    const other = await createUser()
    const othersAddress = await createSavedAddress(other.id)

    const result = await place(
      [{ productId: tee.id, size: "M", quantity: 1 }],
      { addressId: othersAddress.id }
    )

    expect(result).toEqual({
      ok: false,
      reason: "address-not-found",
    })
    expect(await stockOf(tee.id, "M")).toBe(5)
    expect(await orderCount()).toBe(0)
  })

  it("refuses a cart with no lines or a repeated line", async () => {
    const tee = await createProduct()
    const line = {
      productId: tee.id,
      size: "M",
      quantity: 1,
    }

    await expect(place([])).rejects.toThrow()
    await expect(place([line, line])).rejects.toThrow()
  })
})

describe("repeating a request", () => {
  it("returns the same order and takes the stock once", async () => {
    const tee = await createProduct({
      sizes: [{ label: "M", stock: 5 }],
    })
    const key = crypto.randomUUID()
    const lines = [
      { productId: tee.id, size: "M", quantity: 2 },
    ]

    const first = await place(lines, {
      idempotencyKey: key,
    })
    const second = await place(lines, {
      idempotencyKey: key,
    })

    expect(first).toMatchObject({ ok: true, reused: false })
    expect(second).toMatchObject({ ok: true, reused: true })
    if (!first.ok || !second.ok) return
    expect(second.orderId).toBe(first.orderId)
    expect(await orderCount()).toBe(1)
    expect(await stockOf(tee.id, "M")).toBe(3)
  })

  it("makes one order when the repeats arrive at the same moment", async () => {
    const tee = await createProduct({
      sizes: [{ label: "M", stock: 5 }],
    })
    const key = crypto.randomUUID()

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        place(
          [{ productId: tee.id, size: "M", quantity: 2 }],
          {
            idempotencyKey: key,
          }
        )
      )
    )

    expect(results.every((r) => r.ok)).toBe(true)
    expect(
      new Set(results.map((r) => r.ok && r.orderId)).size
    ).toBe(1)
    expect(await orderCount()).toBe(1)
    expect(await stockOf(tee.id, "M")).toBe(3)
  })

  it("does not hand one user's order to another who sends the same key", async () => {
    const tee = await createProduct()
    const key = crypto.randomUUID()
    await place(
      [{ productId: tee.id, size: "M", quantity: 1 }],
      {
        idempotencyKey: key,
      }
    )

    const other = await createUser()
    const otherAddress = await createSavedAddress(other.id)

    await expect(
      place(
        [{ productId: tee.id, size: "M", quantity: 1 }],
        {
          userId: other.id,
          addressId: otherAddress.id,
          idempotencyKey: key,
        }
      )
    ).rejects.toThrow()
    expect(await orderCount()).toBe(1)
  })
})

describe("many buyers at once", () => {
  async function buyers(count: number) {
    return Promise.all(
      Array.from({ length: count }, async () => {
        const user = await createUser()
        const address = await createSavedAddress(user.id)
        return { userId: user.id, addressId: address.id }
      })
    )
  }

  it("never sells more than is in stock", async () => {
    const shirt = await createProduct({
      sizes: [{ label: "M", stock: 5 }],
    })
    const people = await buyers(12)

    const results = await Promise.all(
      people.map((person) =>
        place(
          [{ productId: shirt.id, size: "M", quantity: 1 }],
          person
        )
      )
    )

    expect(results.filter((r) => r.ok)).toHaveLength(5)
    expect(
      results.filter(
        (r) => !r.ok && r.reason === "problems"
      )
    ).toHaveLength(7)
    expect(await stockOf(shirt.id, "M")).toBe(0)
    expect(await orderCount()).toBe(5)
  })

  it("sells whole requests only, so stock is never split", async () => {
    const shirt = await createProduct({
      sizes: [{ label: "M", stock: 5 }],
    })
    const people = await buyers(4)

    const results = await Promise.all(
      people.map((person) =>
        place(
          [{ productId: shirt.id, size: "M", quantity: 2 }],
          person
        )
      )
    )

    expect(results.filter((r) => r.ok)).toHaveLength(2)
    expect(await stockOf(shirt.id, "M")).toBe(1)
  })

  it("leaves no stock taken from a buyer who loses on a later line", async () => {
    const plenty = await createProduct({
      sizes: [{ label: "M", stock: 100 }],
    })
    const scarce = await createProduct({
      sizes: [{ label: "M", stock: 3 }],
    })
    const people = await buyers(8)

    // each wants one of the plentiful shirt and one of the scarce one
    const results = await Promise.all(
      people.map((person) =>
        place(
          [
            {
              productId: plenty.id,
              size: "M",
              quantity: 1,
            },
            {
              productId: scarce.id,
              size: "M",
              quantity: 1,
            },
          ],
          person
        )
      )
    )

    const won = results.filter((r) => r.ok).length
    expect(won).toBe(3)
    expect(await stockOf(scarce.id, "M")).toBe(0)
    // only the winners took the plentiful one: a loser's rolled back
    expect(await stockOf(plenty.id, "M")).toBe(100 - won)
    expect(await orderCount()).toBe(won)
  })

  it("does not deadlock when buyers list the same products in different orders", async () => {
    const a = await createProduct({
      sizes: [{ label: "M", stock: 50 }],
    })
    const b = await createProduct({
      sizes: [{ label: "M", stock: 50 }],
    })
    const people = await buyers(10)

    const results = await Promise.all(
      people.map((person, i) =>
        place(
          i % 2
            ? [
                { productId: a.id, size: "M", quantity: 1 },
                { productId: b.id, size: "M", quantity: 1 },
              ]
            : [
                { productId: b.id, size: "M", quantity: 1 },
                { productId: a.id, size: "M", quantity: 1 },
              ],
          person
        )
      )
    )

    expect(results.every((r) => r.ok)).toBe(true)
    expect(await stockOf(a.id, "M")).toBe(40)
    expect(await stockOf(b.id, "M")).toBe(40)
  })
})
