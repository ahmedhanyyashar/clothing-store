import { describe, expect, it } from "vitest"

import { placeOrderSchema } from "./validations"

const valid = {
  addressId: "addr1",
  idempotencyKey: "0f8fad5b-d9cb-469f-a165-70867728950e",
  paymentMethod: "CARD",
  items: [{ productId: "tee", size: "M", quantity: 2 }],
}

describe("placeOrderSchema", () => {
  it("accepts an order paid by card or in cash", () => {
    expect(placeOrderSchema.safeParse(valid).success).toBe(
      true
    )
    expect(
      placeOrderSchema.safeParse({
        ...valid,
        paymentMethod: "CASH_ON_DELIVERY",
      }).success
    ).toBe(true)
  })

  it.each([
    ["no payment method", { paymentMethod: undefined }],
    [
      "an unknown payment method",
      { paymentMethod: "CRYPTO" },
    ],
    ["a key that is not a uuid", { idempotencyKey: "abc" }],
    ["no lines", { items: [] }],
    [
      "the same product and size twice",
      {
        items: [
          { productId: "tee", size: "M", quantity: 1 },
          { productId: "tee", size: "M", quantity: 2 },
        ],
      },
    ],
    [
      "a quantity of zero",
      {
        items: [
          { productId: "tee", size: "M", quantity: 0 },
        ],
      },
    ],
    [
      "a fraction as quantity",
      {
        items: [
          { productId: "tee", size: "M", quantity: 1.5 },
        ],
      },
    ],
  ])("rejects %s", (_why, change) => {
    expect(
      placeOrderSchema.safeParse({ ...valid, ...change })
        .success
    ).toBe(false)
  })

  it("has no field for a price, so none can be sent", () => {
    const parsed = placeOrderSchema.parse({
      ...valid,
      items: [
        {
          productId: "tee",
          size: "M",
          quantity: 1,
          priceCents: 1,
        },
      ],
    })

    expect(parsed.items[0]).not.toHaveProperty("priceCents")
  })
})
