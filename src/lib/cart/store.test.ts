// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"

import { MAX_LINES, MAX_QUANTITY } from "./model"
import { useCartStore } from "./store"

const tee = { productId: "tee", size: "M" }
const state = () => useCartStore.getState()

beforeEach(() => {
  localStorage.clear()
  useCartStore.setState({ userId: null, lines: [] })
})

describe("add", () => {
  it("adds a line and merges a repeat of the same product and size", () => {
    state().add(tee, 1, 5)
    state().add(tee, 2, 5)

    expect(state().lines).toEqual([{ ...tee, quantity: 3 }])
  })

  it("keeps sizes of one product apart", () => {
    state().add(tee, 1, 5)
    state().add({ ...tee, size: "L" }, 1, 5)

    expect(state().lines).toHaveLength(2)
  })

  it("never goes past the stock, and reports how many were added", () => {
    expect(state().add(tee, 9, 3)).toBe(3)
    expect(state().add(tee, 1, 3)).toBe(0)
    expect(state().lines[0].quantity).toBe(3)
  })

  it("never goes past the per-line maximum, whatever the stock", () => {
    expect(state().add(tee, 99, 500)).toBe(MAX_QUANTITY)
  })

  it("adds nothing when there is no stock", () => {
    expect(state().add(tee, 1, 0)).toBe(0)
    expect(state().lines).toEqual([])
  })

  it("stops growing at the maximum number of lines", () => {
    for (let i = 0; i < MAX_LINES + 5; i++) {
      state().add({ productId: `p${i}`, size: "M" }, 1, 5)
    }

    expect(state().lines).toHaveLength(MAX_LINES)
  })
})

describe("setQuantity, remove and clear", () => {
  it("keeps the quantity between 1 and the maximum", () => {
    state().add(tee, 1, 5)

    state().setQuantity(tee, 0)
    expect(state().lines[0].quantity).toBe(1)
    state().setQuantity(tee, 999)
    expect(state().lines[0].quantity).toBe(MAX_QUANTITY)
  })

  it("removes one line, or all of them", () => {
    state().add(tee, 1, 5)
    state().add({ ...tee, size: "L" }, 1, 5)

    state().remove(tee)
    expect(state().lines).toHaveLength(1)
    state().clear()
    expect(state().lines).toEqual([])
  })
})

describe("setUser", () => {
  it("keeps the cart of a visitor who signs in", () => {
    state().add(tee, 2, 5)
    state().setUser("alice")

    expect(state().userId).toBe("alice")
    expect(state().lines).toHaveLength(1)
  })

  it("keeps the cart when the same user is set again", () => {
    state().setUser("alice")
    state().add(tee, 2, 5)
    state().setUser("alice")

    expect(state().lines).toHaveLength(1)
  })

  it("empties the cart when another user signs in, or the user signs out", () => {
    state().setUser("alice")
    state().add(tee, 2, 5)
    state().setUser("bob")
    expect(state().lines).toEqual([])

    state().add(tee, 1, 5)
    state().setUser(null)
    expect(state().lines).toEqual([])
  })
})

describe("persistence", () => {
  const rehydrate = async (stored: unknown) => {
    localStorage.setItem(
      "cart",
      JSON.stringify({ state: stored, version: 1 })
    )
    await useCartStore.persist.rehydrate()
  }

  it("stores only ids, sizes and quantities", () => {
    state().add(tee, 2, 5)

    const saved = JSON.parse(localStorage.getItem("cart")!)
    expect(saved.state).toEqual({
      userId: null,
      lines: [{ ...tee, quantity: 2 }],
    })
  })

  it("restores a valid cart", async () => {
    await rehydrate({
      userId: "alice",
      lines: [{ ...tee, quantity: 2 }],
    })

    expect(state().userId).toBe("alice")
    expect(state().lines).toEqual([{ ...tee, quantity: 2 }])
  })

  it("drops a cart that was edited into something invalid", async () => {
    await rehydrate({
      userId: null,
      lines: [{ ...tee, quantity: -4 }],
    })

    expect(state().lines).toEqual([])
  })

  it("drops repeated lines", async () => {
    await rehydrate({
      userId: null,
      lines: [
        { ...tee, quantity: 1 },
        { ...tee, quantity: 4 },
      ],
    })

    expect(state().lines).toEqual([{ ...tee, quantity: 1 }])
  })
})
