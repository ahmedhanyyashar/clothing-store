// @vitest-environment jsdom
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { useCartStore } from "@/lib/cart/store"

import { CartToolError, runCartTool } from "./cart-tools"

const { loadCartProducts } = vi.hoisted(() => ({
  loadCartProducts: vi.fn(),
}))
vi.mock("@/lib/cart/actions", () => ({ loadCartProducts }))

const tee = { productId: "tee", size: "M" }
const product = (stock: number) => [
  {
    ...tee,
    name: "Tee",
    priceCents: 2000,
    imageUrl: null,
    stock,
  },
]

beforeEach(() => {
  localStorage.clear()
  useCartStore.setState({ userId: null, lines: [] })
  loadCartProducts.mockResolvedValue(product(3))
})

describe("runCartTool", () => {
  it("adds up to the stock the server reports", async () => {
    const result = await runCartTool("addToCart", {
      ...tee,
      quantity: 5,
    })

    expect(result).toEqual({ added: 3, stock: 3 })
    expect(useCartStore.getState().lines).toEqual([
      { ...tee, quantity: 3 },
    ])
  })

  it("refuses a size that is gone or sold out", async () => {
    loadCartProducts.mockResolvedValue([])
    await expect(
      runCartTool("addToCart", { ...tee, quantity: 1 })
    ).rejects.toBeInstanceOf(CartToolError)

    loadCartProducts.mockResolvedValue(product(0))
    await expect(
      runCartTool("addToCart", { ...tee, quantity: 1 })
    ).rejects.toBeInstanceOf(CartToolError)
    expect(useCartStore.getState().lines).toEqual([])
  })

  it("changes only what is in the cart, within the stock", async () => {
    await expect(
      runCartTool("setCartQuantity", {
        ...tee,
        quantity: 2,
      })
    ).rejects.toBeInstanceOf(CartToolError)

    await runCartTool("addToCart", { ...tee, quantity: 1 })
    await runCartTool("setCartQuantity", {
      ...tee,
      quantity: 9,
    })

    expect(useCartStore.getState().lines[0]?.quantity).toBe(
      3
    )
  })

  it("rejects input the model got wrong", async () => {
    await expect(
      runCartTool("addToCart", {
        productId: "tee",
        quantity: 1,
      })
    ).rejects.toThrow()
    await expect(
      runCartTool("addToCart", { ...tee, quantity: 999 })
    ).rejects.toThrow()
  })

  it("removes a line and shows the cart with its subtotal", async () => {
    await runCartTool("addToCart", { ...tee, quantity: 2 })

    expect(await runCartTool("viewCart", {})).toEqual({
      lines: [
        {
          name: "Tee",
          size: "M",
          quantity: 2,
          status: "ok",
        },
      ],
      subtotal: "$40.00",
    })

    await runCartTool("removeFromCart", tee)
    expect(useCartStore.getState().lines).toEqual([])
  })
})
