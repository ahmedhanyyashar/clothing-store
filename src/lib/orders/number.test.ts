import { describe, expect, it } from "vitest"

import {
  generateOrderNumber,
  ORDER_NUMBER_PATTERN,
} from "./number"

describe("generateOrderNumber", () => {
  it("looks like CS- and eight readable characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOrderNumber()).toMatch(
        ORDER_NUMBER_PATTERN
      )
    }
  })

  it("never uses characters that are easy to confuse", () => {
    const all = Array.from(
      { length: 500 },
      generateOrderNumber
    ).join("")
    expect(all.replace(/CS-/g, "")).not.toMatch(/[01ILO]/)
  })

  it("does not repeat", () => {
    const numbers = new Set(
      Array.from({ length: 2000 }, generateOrderNumber)
    )
    expect(numbers.size).toBe(2000)
  })

  it("is not a sequence", () => {
    const [a, b] = [
      generateOrderNumber(),
      generateOrderNumber(),
    ]
    expect(a.slice(3)).not.toBe(b.slice(3))
  })
})
