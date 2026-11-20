import { beforeEach, describe, expect, it } from "vitest"

import {
  createCardOrder,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { assistantTools, orderTools } from "./tools"

// the options a tool receives from the model loop; these tools ignore them
const options = {
  toolCallId: "test",
  messages: [],
  context: {},
}

beforeEach(resetDb)

describe("assistant tools", () => {
  it("has no order tools for a visitor, and runs the cart tools in the browser", () => {
    const tools = assistantTools(null)

    expect(tools).not.toHaveProperty("listMyOrders")
    expect(tools).not.toHaveProperty("getOrderStatus")
    expect(tools.addToCart).not.toHaveProperty("execute")
  })

  it("shows a shopper their own orders, and nobody else's", async () => {
    const { order, user } = await createCardOrder()
    const stranger = await createUser()

    const own = orderTools(user.id)
    const other = orderTools(stranger.id)

    expect(
      await own.listMyOrders.execute!({}, options)
    ).toHaveLength(1)
    expect(
      await other.listMyOrders.execute!({}, options)
    ).toEqual([])
    expect(
      await other.getOrderStatus.execute!(
        { number: order.number },
        options
      )
    ).toEqual({ found: false })
    expect(
      await own.getOrderStatus.execute!(
        { number: order.number },
        options
      )
    ).toMatchObject({ found: true, number: order.number })
  })
})
