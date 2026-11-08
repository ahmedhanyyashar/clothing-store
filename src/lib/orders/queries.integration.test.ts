import { beforeEach, describe, expect, it } from "vitest"

import {
  createProduct,
  createSavedAddress,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { placeOrder } from "./place"
import { getOrder, listOrders } from "./queries"

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

describe("reading orders", () => {
  it("lists a user's orders, newest first, and only theirs", async () => {
    const tee = await createProduct()
    const first = await buy(tee.id)
    const second = await buy(tee.id)
    await buy(tee.id, 1, await other())

    const orders = await listOrders(userId)

    expect(orders.map((o) => o.number)).toEqual([
      second.number,
      first.number,
    ])
  })

  it("finds an order by its number, but not for someone else", async () => {
    const tee = await createProduct({ name: "Tee" })
    const placed = await buy(tee.id, 2)
    const stranger = await createUser()

    const mine = await getOrder(userId, placed.number)
    const theirs = await getOrder(
      stranger.id,
      placed.number
    )

    expect(mine?.items[0]).toMatchObject({
      name: "Tee",
      quantity: 2,
    })
    expect(theirs).toBeNull()
  })
})
