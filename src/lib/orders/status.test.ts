import { describe, expect, it } from "vitest"

import type { OrderStatus } from "@/generated/prisma/enums"

import {
  ACTIVE_STATUSES,
  canCustomerCancel,
  canTransition,
  ORDER_STATUS_INFO,
  ORDER_TRANSITIONS,
} from "./status"

const ALL = Object.keys(ORDER_STATUS_INFO) as OrderStatus[]

describe("order status", () => {
  it("only moves forward, or to cancelled", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true)
    expect(canTransition("CONFIRMED", "SHIPPED")).toBe(true)
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true)
    expect(canTransition("DELIVERED", "SHIPPED")).toBe(
      false
    )
    expect(canTransition("CONFIRMED", "PENDING")).toBe(
      false
    )
    expect(canTransition("PENDING", "DELIVERED")).toBe(
      false
    )
  })

  it("can be cancelled before it ships, and not after", () => {
    expect(canTransition("PENDING", "CANCELLED")).toBe(true)
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(
      true
    )
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(
      false
    )
  })

  it("is final once delivered or cancelled", () => {
    expect(ORDER_TRANSITIONS.DELIVERED).toEqual([])
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([])
  })

  it("lets a customer cancel only a pending order", () => {
    expect(ALL.filter(canCustomerCancel)).toEqual([
      "PENDING",
    ])
  })

  it("holds stock and an address for every status that is not final", () => {
    const final = ALL.filter(
      (s) => ORDER_TRANSITIONS[s].length === 0
    )
    expect([...ACTIVE_STATUSES].sort()).toEqual(
      ALL.filter((s) => !final.includes(s)).sort()
    )
  })

  it("explains every status in words", () => {
    for (const status of ALL) {
      expect(ORDER_STATUS_INFO[status].label).toBeTruthy()
      expect(
        ORDER_STATUS_INFO[status].description
      ).toBeTruthy()
    }
  })
})
