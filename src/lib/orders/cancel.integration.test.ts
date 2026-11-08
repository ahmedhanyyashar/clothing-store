import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import {
  createProduct,
  createSavedAddress,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { cancelOrder } from "./cancel"
import { placeOrder } from "./place"

let userId: string
let addressId: string

beforeEach(async () => {
  await resetDb()
  userId = (await createUser()).id
  addressId = (await createSavedAddress(userId)).id
})

async function buy(
  productId: string,
  quantity = 1,
  as = { userId, addressId }
) {
  const result = await placeOrder({
    ...as,
    idempotencyKey: crypto.randomUUID(),
    items: [{ productId, size: "M", quantity }],
  })
  if (!result.ok) throw new Error("not placed")
  return result
}

const stockOf = async (productId: string) =>
  (
    await prisma.productSize.findFirstOrThrow({
      where: { productId, label: "M" },
    })
  ).stock

describe("cancelling", () => {
  it("cancels a pending order and puts the stock back", async () => {
    const tee = await createProduct({
      sizes: [{ label: "M", stock: 5 }],
    })
    const placed = await buy(tee.id, 3)
    expect(await stockOf(tee.id)).toBe(2)

    expect(await cancelOrder(userId, placed.number)).toBe(
      "cancelled"
    )

    expect(await stockOf(tee.id)).toBe(5)
    const order = await prisma.order.findFirstOrThrow()
    expect(order.status).toBe("CANCELLED")
    expect(order.cancelledAt).not.toBeNull()
  })

  it("restores the stock once, however often or fast it is asked", async () => {
    const tee = await createProduct({
      sizes: [{ label: "M", stock: 5 }],
    })
    const placed = await buy(tee.id, 3)

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        cancelOrder(userId, placed.number)
      )
    )

    expect(
      results.filter((r) => r === "cancelled")
    ).toHaveLength(1)
    expect(
      results.filter((r) => r === "not-cancellable")
    ).toHaveLength(5)
    expect(await stockOf(tee.id)).toBe(5)
  })

  it("cannot cancel an order that is no longer pending", async () => {
    const tee = await createProduct({
      sizes: [{ label: "M", stock: 5 }],
    })
    const placed = await buy(tee.id, 2)
    await prisma.order.updateMany({
      data: { status: "CONFIRMED" },
    })

    expect(await cancelOrder(userId, placed.number)).toBe(
      "not-cancellable"
    )
    expect(await stockOf(tee.id)).toBe(3)
  })

  it("cannot cancel someone else's order", async () => {
    const tee = await createProduct({
      sizes: [{ label: "M", stock: 5 }],
    })
    const placed = await buy(tee.id, 2)
    const stranger = await createUser()

    expect(
      await cancelOrder(stranger.id, placed.number)
    ).toBe("not-found")
    expect(await stockOf(tee.id)).toBe(3)
  })

  it("still cancels when a product was deleted in the meantime", async () => {
    const tee = await createProduct()
    const placed = await buy(tee.id)
    await prisma.product.delete({ where: { id: tee.id } })

    expect(await cancelOrder(userId, placed.number)).toBe(
      "cancelled"
    )
  })

  it("leaves other sizes of the product alone", async () => {
    const tee = await createProduct({
      sizes: [
        { label: "S", stock: 5 },
        { label: "M", stock: 5 },
      ],
    })
    const placed = await buy(tee.id, 2)

    await cancelOrder(userId, placed.number)

    const sizes = await prisma.productSize.findMany({
      where: { productId: tee.id },
      orderBy: { label: "asc" },
    })
    expect(sizes.map((s) => s.stock)).toEqual([5, 5])
  })
})
