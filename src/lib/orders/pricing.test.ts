import { describe, expect, it } from "vitest"

import {
  computeTotals,
  FREE_SHIPPING_FROM_CENTS,
  SHIPPING_FLAT_CENTS,
} from "./pricing"

describe("computeTotals", () => {
  it("adds the flat fee below the free-shipping threshold", () => {
    expect(computeTotals(2000)).toEqual({
      subtotalCents: 2000,
      shippingCents: SHIPPING_FLAT_CENTS,
      totalCents: 2000 + SHIPPING_FLAT_CENTS,
    })
  })

  it("is free at the threshold and above it, and not one cent before", () => {
    expect(
      computeTotals(FREE_SHIPPING_FROM_CENTS).shippingCents
    ).toBe(0)
    expect(
      computeTotals(FREE_SHIPPING_FROM_CENTS + 1)
        .shippingCents
    ).toBe(0)
    expect(
      computeTotals(FREE_SHIPPING_FROM_CENTS - 1)
        .shippingCents
    ).toBe(SHIPPING_FLAT_CENTS)
  })

  it("charges nothing for an empty cart", () => {
    expect(computeTotals(0)).toEqual({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
    })
  })

  it("only ever returns whole cents", () => {
    for (const subtotal of [
      1, 99, 1999, 7499, 7500, 123456,
    ]) {
      const { shippingCents, totalCents } =
        computeTotals(subtotal)
      expect(Number.isInteger(shippingCents)).toBe(true)
      expect(Number.isInteger(totalCents)).toBe(true)
    }
  })
})
