import { describe, expect, it } from "vitest"

import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/enums"

import { availableActions } from "./order-rules"

const order = (
  status: OrderStatus,
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus
) => ({ status, paymentMethod, paymentStatus })

describe("availableActions", () => {
  it("lets a cash order go forward one step at a time", () => {
    const cash = "CASH_ON_DELIVERY"
    expect(
      availableActions(order("PENDING", cash, "PENDING"))
    ).toEqual(["confirm", "cancel"])
    expect(
      availableActions(order("CONFIRMED", cash, "PENDING"))
    ).toEqual(["ship", "cancel"])
    expect(
      availableActions(order("SHIPPED", cash, "PENDING"))
    ).toEqual(["deliver"])
    expect(
      availableActions(order("DELIVERED", cash, "PAID"))
    ).toEqual([])
  })

  it("never confirms a card order that has not been paid", () => {
    expect(
      availableActions(order("PENDING", "CARD", "PENDING"))
    ).toEqual(["cancel"])
  })

  it("lets a paid card order be shipped or cancelled", () => {
    expect(
      availableActions(order("CONFIRMED", "CARD", "PAID"))
    ).toEqual(["ship", "cancel"])
  })

  it("cannot cancel an order once it has shipped", () => {
    expect(
      availableActions(order("SHIPPED", "CARD", "PAID"))
    ).not.toContain("cancel")
  })

  it("offers nothing on a finished order, except the refund still owed", () => {
    expect(
      availableActions(
        order("CANCELLED", "CASH_ON_DELIVERY", "PENDING")
      )
    ).toEqual([])
    expect(
      availableActions(order("CANCELLED", "CARD", "FAILED"))
    ).toEqual([])
    expect(
      availableActions(
        order("CANCELLED", "CARD", "REFUNDED")
      )
    ).toEqual([])
    expect(
      availableActions(order("CANCELLED", "CARD", "PAID"))
    ).toEqual(["refund"])
  })
})
