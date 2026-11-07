import { describe, expect, it } from "vitest"

import type { CartLine, CartProduct } from "./model"
import { buildCart } from "./summary"

const tee: CartProduct = {
  productId: "tee",
  size: "M",
  name: "Tee",
  priceCents: 2499,
  imageUrl: null,
  stock: 5,
}

const line = (
  productId: string,
  size: string,
  quantity: number
): CartLine => ({ productId, size, quantity })

describe("buildCart", () => {
  it("prices lines from the server's details, in whole cents", () => {
    const cart = buildCart(
      [line("tee", "M", 3)],
      [tee],
      true
    )

    expect(cart.rows[0]).toMatchObject({
      status: "ok",
      quantity: 3,
      totalCents: 7497,
    })
    expect(cart.itemCount).toBe(3)
    expect(cart.subtotalCents).toBe(7497)
  })

  it("cuts a quantity that is above the stock, and says so", () => {
    const cart = buildCart(
      [line("tee", "M", 9)],
      [tee],
      true
    )

    expect(cart.rows[0]).toMatchObject({
      status: "limited",
      quantity: 5,
    })
    expect(cart.subtotalCents).toBe(5 * 2499)
  })

  it("leaves a sold-out line and a vanished one out of the total", () => {
    const cart = buildCart(
      [
        line("tee", "M", 1),
        line("tee", "L", 1),
        line("gone", "M", 2),
      ],
      [tee, { ...tee, size: "L", stock: 0 }],
      true
    )

    expect(cart.rows.map((row) => row.status)).toEqual([
      "ok",
      "sold-out",
      "missing",
    ])
    expect(cart.itemCount).toBe(1)
    expect(cart.subtotalCents).toBe(2499)
  })

  it("marks lines without details as loading until the lookup settles", () => {
    const lines = [line("tee", "M", 1)]

    expect(buildCart(lines, [], false).rows[0].status).toBe(
      "loading"
    )
    expect(buildCart(lines, [], true).rows[0].status).toBe(
      "missing"
    )
  })
})
