import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import {
  createProduct,
  createSavedAddress,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { anonymiseOrders, hasActiveOrders } from "./account"
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

async function other() {
  const user = await createUser()
  const address = await createSavedAddress(user.id)
  return { userId: user.id, addressId: address.id }
}

describe("deleting an account", () => {
  it("counts pending, confirmed and shipped orders as active", async () => {
    const tee = await createProduct({
      sizes: [{ label: "M", stock: 50 }],
    })
    expect(await hasActiveOrders(userId)).toBe(false)

    for (const status of [
      "PENDING",
      "CONFIRMED",
      "SHIPPED",
    ] as const) {
      await prisma.order.deleteMany()
      await buy(tee.id)
      await prisma.order.updateMany({ data: { status } })
      expect(await hasActiveOrders(userId)).toBe(true)
    }
  })

  it("does not count delivered or cancelled orders, or other people's", async () => {
    const tee = await createProduct({
      sizes: [{ label: "M", stock: 50 }],
    })
    await buy(tee.id)
    await prisma.order.updateMany({
      data: { status: "DELIVERED" },
    })
    await buy(tee.id)
    await prisma.order.updateMany({
      where: { status: "PENDING" },
      data: { status: "CANCELLED" },
    })
    await buy(tee.id, 1, await other())

    expect(await hasActiveOrders(userId)).toBe(false)
  })

  it("replaces the personal details on the user's orders and nothing else", async () => {
    const tee = await createProduct({ name: "Tee" })
    await buy(tee.id)
    const strangers = await other()
    await buy(tee.id, 1, strangers)

    await anonymiseOrders(userId)

    const mine = await prisma.order.findFirstOrThrow({
      where: { userId },
      include: { items: true },
    })
    expect(mine).toMatchObject({
      shipName: "Deleted customer",
      shipPhone: "",
      shipLine1: "Deleted",
      shipCity: "Deleted",
      shipRegion: null,
      shipPostalCode: null,
      shipNotes: null,
      shipCountry: "US",
    })
    expect(mine.items[0].name).toBe("Tee")
    const theirs = await prisma.order.findFirstOrThrow({
      where: { userId: strangers.userId },
    })
    expect(theirs.shipName).toBe("Ada Lovelace")
  })

  it("keeps the orders when the user is deleted", async () => {
    const tee = await createProduct()
    await buy(tee.id)

    await prisma.user.delete({ where: { id: userId } })

    const order = await prisma.order.findFirstOrThrow()
    expect(order.userId).toBeNull()
  })
})
