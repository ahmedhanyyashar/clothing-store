import { describe, expect, it } from "vitest"

import { formatPrice } from "./format"

describe("formatPrice", () => {
  it.each([
    [2499, "$24.99"],
    [8000, "$80.00"],
    [5, "$0.05"],
    [0, "$0.00"],
    [123456789, "$1,234,567.89"],
  ])("formats %i cents as %s", (cents, text) => {
    expect(formatPrice(cents)).toBe(text)
  })
})
