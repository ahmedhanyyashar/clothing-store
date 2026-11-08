import type Stripe from "stripe"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { prisma } from "@/lib/db/client"
import { cancelOrder } from "@/lib/orders/cancel"
import { placeOrder } from "@/lib/orders/place"
import {
  createCardOrder,
  createProduct,
  createSavedAddress,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { expireSession, paymentUrlFor } from "./checkout"
import { stripe } from "./stripe"
import { abandonCardOrder } from "./unpaid"

beforeEach(resetDb)
afterEach(() => vi.restoreAllMocks())

const stockOf = async (productId: string) =>
  (
    await prisma.productSize.findFirstOrThrow({
      where: { productId, label: "M" },
    })
  ).stock

/** The parameters of the one Stripe session created while `run` ran. */
async function createdSession(run: () => Promise<unknown>) {
  const create = vi.spyOn(
    stripe.checkout.sessions,
    "create"
  )
  await run()
  expect(create).toHaveBeenCalledTimes(1)
  return create.mock
    .calls[0][0] as Stripe.Checkout.SessionCreateParams
}

describe("the payment page of a card order", () => {
  it("is a Stripe session built from the order's own copies, and is remembered", async () => {
    const { order } = await createCardOrder(2)

    const params = await createdSession(async () => {
      const result = await paymentUrlFor(order.id)
      expect(result).toMatchObject({
        ok: true,
        url: expect.stringMatching(
          /^https:\/\/checkout\.stripe\.com\//
        ),
      })
    })

    expect(params).toMatchObject({
      mode: "payment",
      client_reference_id: order.number,
      metadata: {
        orderId: order.id,
        orderNumber: order.number,
      },
    })
    expect(params.line_items).toEqual([
      expect.objectContaining({
        quantity: 2,
        price_data: expect.objectContaining({
          currency: "usd",
          unit_amount: 2000,
        }),
      }),
    ])
    // $40.00 is below the free-shipping line: shipping is a separate, fixed rate
    expect(
      params.shipping_options?.[0].shipping_rate_data
    ).toMatchObject({
      fixed_amount: { amount: 500, currency: "usd" },
    })
    // the session closes on its own, so stock is not held for ever
    const lifetime = params.expires_at! - Date.now() / 1000
    expect(lifetime).toBeGreaterThan(30 * 60)
    expect(lifetime).toBeLessThan(60 * 60)
    expect(
      (
        await prisma.order.findUniqueOrThrow({
          where: { id: order.id },
        })
      ).stripeSessionId
    ).toMatch(/^cs_test_/)
  })

  it("adds no shipping line when shipping is free", async () => {
    const user = await createUser()
    const address = await createSavedAddress(user.id)
    const product = await createProduct({
      priceCents: 8000,
    })
    const placed = await placeOrder({
      userId: user.id,
      addressId: address.id,
      idempotencyKey: crypto.randomUUID(),
      items: [
        { productId: product.id, size: "M", quantity: 1 },
      ],
      paymentMethod: "CARD",
    })
    if (!placed.ok) throw new Error("not placed")

    const params = await createdSession(() =>
      paymentUrlFor(placed.orderId)
    )

    expect(params.shipping_options).toBeUndefined()
  })

  it("sends product images only when they are publicly reachable", async () => {
    const { order } = await createCardOrder()

    const params = await createdSession(() =>
      paymentUrlFor(order.id)
    )

    // the test app runs on http://localhost: Stripe could not fetch an image from it
    const line = params
      .line_items?.[0] as Stripe.Checkout.SessionCreateParams.LineItem
    expect(
      line.price_data?.product_data?.images
    ).toBeUndefined()
  })

  it("returns the same page when asked again, without making a second session", async () => {
    const { order } = await createCardOrder()
    const first = await paymentUrlFor(order.id)
    const create = vi.spyOn(
      stripe.checkout.sessions,
      "create"
    )

    const second = await paymentUrlFor(order.id)

    expect(second).toEqual(first)
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    [
      "paid",
      { paymentStatus: "PAID", status: "CONFIRMED" },
    ],
    [
      "cancelled",
      { paymentStatus: "FAILED", status: "CANCELLED" },
    ],
    ["paid by cash", { paymentMethod: "CASH_ON_DELIVERY" }],
  ] as const)(
    "is not offered for an order that is %s",
    async (_why, change) => {
      const { order } = await createCardOrder()
      await prisma.order.update({
        where: { id: order.id },
        data: change,
      })
      const create = vi.spyOn(
        stripe.checkout.sessions,
        "create"
      )

      expect(await paymentUrlFor(order.id)).toEqual({
        ok: false,
        reason: "not-payable",
      })
      expect(create).not.toHaveBeenCalled()
    }
  )

  it("is not offered once Stripe says the session is closed", async () => {
    const { order } = await createCardOrder()
    await paymentUrlFor(order.id)
    vi.spyOn(
      stripe.checkout.sessions,
      "retrieve"
    ).mockResolvedValue({
      status: "expired",
      url: null,
    } as never)

    expect(await paymentUrlFor(order.id)).toEqual({
      ok: false,
      reason: "not-payable",
    })
  })

  it("reports that Stripe is unavailable instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { order } = await createCardOrder()
    vi.spyOn(
      stripe.checkout.sessions,
      "create"
    ).mockRejectedValue(new Error("network down"))

    expect(await paymentUrlFor(order.id)).toEqual({
      ok: false,
      reason: "unavailable",
    })
  })

  it("uses one idempotency key per order, so a repeat gets the same session from Stripe", async () => {
    const { order } = await createCardOrder()
    const create = vi.spyOn(
      stripe.checkout.sessions,
      "create"
    )

    await paymentUrlFor(order.id)

    expect(create.mock.calls[0][1]).toEqual({
      idempotencyKey: `checkout-${order.id}`,
    })
  })
})

describe("giving up on a card order that could not be paid", () => {
  it("cancels it and puts the stock back", async () => {
    const { order, product } = await createCardOrder(3)
    expect(await stockOf(product.id)).toBe(7)

    expect(await abandonCardOrder(order.id)).toBe(true)

    expect(
      await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
      })
    ).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "FAILED",
    })
    expect(await stockOf(product.id)).toBe(10)
  })

  it("does nothing to an order that was paid in the meantime", async () => {
    const { order, product } = await createCardOrder(3)
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    })

    expect(await abandonCardOrder(order.id)).toBe(false)
    expect(await stockOf(product.id)).toBe(7)
  })

  it("does nothing twice", async () => {
    const { order, product } = await createCardOrder(3)

    await abandonCardOrder(order.id)
    expect(await abandonCardOrder(order.id)).toBe(false)

    expect(await stockOf(product.id)).toBe(10)
  })
})

describe("cancelling a card order", () => {
  it("marks the payment as not made and restores the stock", async () => {
    const { order, product, user } =
      await createCardOrder(3)

    expect(await cancelOrder(user.id, order.number)).toBe(
      "cancelled"
    )

    expect(
      await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
      })
    ).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "FAILED",
    })
    expect(await stockOf(product.id)).toBe(10)
  })

  it("cannot cancel a paid order", async () => {
    const { order, user } = await createCardOrder()
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    })

    expect(await cancelOrder(user.id, order.number)).toBe(
      "not-cancellable"
    )
  })
})

describe("closing a payment page", () => {
  it("asks Stripe to expire the session", async () => {
    const expire = vi.spyOn(
      stripe.checkout.sessions,
      "expire"
    )

    await expireSession("cs_test_123")

    expect(expire).toHaveBeenCalledWith("cs_test_123")
  })

  it("does not fail when Stripe refuses, because a late payment is refunded anyway", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(
      stripe.checkout.sessions,
      "expire"
    ).mockRejectedValue(new Error("already complete"))

    await expect(
      expireSession("cs_test_123")
    ).resolves.toBeUndefined()
  })
})
