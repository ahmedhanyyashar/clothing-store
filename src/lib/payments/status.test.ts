import { describe, expect, it } from "vitest"

import type {
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/enums"

import {
  isAwaitingCardPayment,
  PAYMENT_METHOD_LABEL,
  paymentStatusLabel,
} from "./status"

const METHODS = Object.keys(
  PAYMENT_METHOD_LABEL
) as PaymentMethod[]
const STATUSES: PaymentStatus[] = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]

describe("payment labels", () => {
  it("has words for every method and status", () => {
    for (const method of METHODS) {
      expect(PAYMENT_METHOD_LABEL[method]).toBeTruthy()
      for (const status of STATUSES) {
        expect(
          paymentStatusLabel(method, status)
        ).toBeTruthy()
      }
    }
  })

  it("says what pending means for each way of paying", () => {
    expect(paymentStatusLabel("CARD", "PENDING")).toBe(
      "Awaiting payment"
    )
    expect(
      paymentStatusLabel("CASH_ON_DELIVERY", "PENDING")
    ).toBe("To pay on delivery")
  })
})

describe("isAwaitingCardPayment", () => {
  const waiting = {
    paymentMethod: "CARD",
    paymentStatus: "PENDING",
    status: "PENDING",
  } as const

  it("is true for a card order that is placed and unpaid", () => {
    expect(isAwaitingCardPayment(waiting)).toBe(true)
  })

  it.each([
    { paymentMethod: "CASH_ON_DELIVERY" },
    { paymentStatus: "PAID" },
    { paymentStatus: "REFUNDED" },
    { status: "CANCELLED" },
    { status: "CONFIRMED" },
  ] as const)("is false once %o", (change) => {
    expect(
      isAwaitingCardPayment({ ...waiting, ...change })
    ).toBe(false)
  })
})
