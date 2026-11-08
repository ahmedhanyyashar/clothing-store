import { randomUUID } from "node:crypto"

import type Stripe from "stripe"
import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import { createCardOrder } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import {
  handleStripeEvent,
  PaymentMismatchError,
} from "./webhook"

type Order = Awaited<
  ReturnType<typeof createCardOrder>
>["order"]

beforeEach(resetDb)

const stockOf = async (productId: string) =>
  (
    await prisma.productSize.findFirstOrThrow({
      where: { productId, label: "M" },
    })
  ).stock

const reload = (order: Order) =>
  prisma.order.findUniqueOrThrow({
    where: { id: order.id },
  })

/** An event as Stripe would send it for this order's session. */
function event(
  type: string,
  order: Order,
  session: Partial<Stripe.Checkout.Session> = {}
) {
  return {
    id: `evt_${randomUUID()}`,
    type,
    data: {
      object: {
        id: order.stripeSessionId,
        object: "checkout.session",
        client_reference_id: order.number,
        metadata: {
          orderId: order.id,
          orderNumber: order.number,
        },
        payment_status: "paid",
        amount_total: order.totalCents,
        currency: "usd",
        payment_intent: `pi_${randomUUID()}`,
        ...session,
      },
    },
  } as unknown as Stripe.Event
}

const completed = (order: Order, over = {}) =>
  event("checkout.session.completed", order, over)
const expired = (order: Order) =>
  event("checkout.session.expired", order, {
    payment_status: "unpaid",
  })

describe("a payment", () => {
  it("confirms the order and records the payment", async () => {
    const { order } = await createCardOrder()

    const result = await handleStripeEvent(completed(order))

    expect(result).toEqual({
      outcome: "paid",
      orderId: order.id,
    })
    expect(await reload(order)).toMatchObject({
      status: "CONFIRMED",
      paymentStatus: "PAID",
      stripePaymentIntentId: expect.stringMatching(/^pi_/),
    })
    expect((await reload(order)).paidAt).not.toBeNull()
  })

  it("is applied once, however many times Stripe sends the event", async () => {
    const { order } = await createCardOrder()
    const e = completed(order)

    expect(await handleStripeEvent(e)).toMatchObject({
      outcome: "paid",
    })
    expect(await handleStripeEvent(e)).toEqual({
      outcome: "duplicate",
    })
    expect(await prisma.stripeEvent.count()).toBe(1)
  })

  it("is applied once when copies of the event arrive at the same moment", async () => {
    const { order } = await createCardOrder()
    const e = completed(order)

    const results = await Promise.all(
      Array.from({ length: 6 }, () => handleStripeEvent(e))
    )

    expect(
      results.filter((r) => r.outcome === "paid")
    ).toHaveLength(1)
    expect(
      results.filter((r) => r.outcome === "duplicate")
    ).toHaveLength(5)
    expect(await prisma.stripeEvent.count()).toBe(1)
  })

  it("changes nothing when the order was already paid by another event", async () => {
    const { order } = await createCardOrder()
    await handleStripeEvent(completed(order))

    const again = await handleStripeEvent(completed(order))

    expect(again).toEqual({ outcome: "processed" })
    expect((await reload(order)).paymentStatus).toBe("PAID")
  })

  it("waits for the money when the payment method pays later", async () => {
    const { order } = await createCardOrder()

    await handleStripeEvent(
      completed(order, { payment_status: "unpaid" })
    )
    expect(await reload(order)).toMatchObject({
      status: "PENDING",
      paymentStatus: "PENDING",
    })

    const later = await handleStripeEvent(
      event(
        "checkout.session.async_payment_succeeded",
        order
      )
    )
    expect(later).toMatchObject({ outcome: "paid" })
    expect(await reload(order)).toMatchObject({
      status: "CONFIRMED",
      paymentStatus: "PAID",
    })
  })

  it("is refused when the amount is not what the order costs", async () => {
    const { order } = await createCardOrder()

    await expect(
      handleStripeEvent(
        completed(order, { amount_total: 1 })
      )
    ).rejects.toThrow(PaymentMismatchError)
    await expect(
      handleStripeEvent(
        completed(order, { currency: "eur" })
      )
    ).rejects.toThrow(PaymentMismatchError)

    expect(await reload(order)).toMatchObject({
      status: "PENDING",
      paymentStatus: "PENDING",
    })
    // nothing was recorded, so a corrected event can still be applied
    expect(await prisma.stripeEvent.count()).toBe(0)
  })

  it("does nothing for an order that does not exist or pays by cash", async () => {
    const { order } = await createCardOrder()
    const unknown = completed(order, {
      client_reference_id: "CS-NOSUCH22",
    })
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentMethod: "CASH_ON_DELIVERY" },
    })

    expect(await handleStripeEvent(unknown)).toEqual({
      outcome: "processed",
    })
    expect(
      await handleStripeEvent(completed(order))
    ).toEqual({
      outcome: "processed",
    })
    expect((await reload(order)).paymentStatus).toBe(
      "PENDING"
    )
  })

  it("ignores events about other things, without storing them", async () => {
    const { order } = await createCardOrder()

    const result = await handleStripeEvent(
      event("customer.created", order)
    )

    expect(result).toEqual({ outcome: "ignored" })
    expect(await prisma.stripeEvent.count()).toBe(0)
  })
})

describe("a session that expires or fails", () => {
  it("cancels the order and puts the stock back", async () => {
    const { order, product } = await createCardOrder(3)
    expect(await stockOf(product.id)).toBe(7)

    await handleStripeEvent(expired(order))

    expect(await reload(order)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "FAILED",
    })
    expect(await stockOf(product.id)).toBe(10)
  })

  it("puts the stock back once, however often it is told", async () => {
    const { order, product } = await createCardOrder(3)

    await handleStripeEvent(expired(order))
    await handleStripeEvent(expired(order))
    await handleStripeEvent(
      event(
        "checkout.session.async_payment_failed",
        order,
        {
          payment_status: "unpaid",
        }
      )
    )

    expect(await stockOf(product.id)).toBe(10)
  })

  it("leaves an order that was paid alone", async () => {
    const { order, product } = await createCardOrder(3)
    await handleStripeEvent(completed(order))

    await handleStripeEvent(expired(order))

    expect(await reload(order)).toMatchObject({
      status: "CONFIRMED",
      paymentStatus: "PAID",
    })
    expect(await stockOf(product.id)).toBe(7)
  })

  it("leaves an order the customer already cancelled alone", async () => {
    const { order, product } = await createCardOrder(3)
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    })
    await prisma.productSize.updateMany({
      where: { productId: product.id },
      data: { stock: 10 },
    })

    await handleStripeEvent(expired(order))

    expect(await stockOf(product.id)).toBe(10)
  })
})

describe("a payment that arrives too late", () => {
  it("is refunded, and the order stays cancelled", async () => {
    const { order, product } = await createCardOrder(3)
    await handleStripeEvent(expired(order))

    const result = await handleStripeEvent(completed(order))

    expect(result).toEqual({ outcome: "processed" })
    const after = await reload(order)
    expect(after).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "REFUNDED",
    })
    expect(after.paidAt).not.toBeNull()
    expect(after.refundedAt).not.toBeNull()
    // the stock was not taken again
    expect(await stockOf(product.id)).toBe(10)
  })

  it("is refunded once when copies of the event race", async () => {
    const { order } = await createCardOrder()
    await handleStripeEvent(expired(order))
    const e = completed(order)

    const results = await Promise.all(
      Array.from({ length: 5 }, () => handleStripeEvent(e))
    )

    expect(results.every((r) => r.outcome !== "paid")).toBe(
      true
    )
    expect((await reload(order)).paymentStatus).toBe(
      "REFUNDED"
    )
    // recorded once, although five copies were handled
    expect(
      await prisma.stripeEvent.count({
        where: { id: e.id },
      })
    ).toBe(1)
  })

  it("can be retried when the refund could not be made", async () => {
    const { order } = await createCardOrder()
    await handleStripeEvent(expired(order))
    // a payment with no payment intent cannot be refunded
    const broken = completed(order, {
      payment_intent: null,
    })
    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: null },
    })

    await expect(
      handleStripeEvent(broken)
    ).rejects.toThrow()

    // the event was not marked handled, so the retry is not a duplicate
    expect(
      await prisma.stripeEvent.count({
        where: { id: broken.id },
      })
    ).toBe(0)
  })
})

describe("a payment and an expiry for the same order at once", () => {
  it.each([1, 2, 3, 4, 5, 6])(
    "always ends in a consistent state (run %i)",
    async () => {
      const { order, product } = await createCardOrder(3)

      await Promise.all([
        handleStripeEvent(completed(order)),
        handleStripeEvent(expired(order)),
      ])

      const after = await reload(order)
      const stock = await stockOf(product.id)
      if (after.paymentStatus === "PAID") {
        // paid first: the order is confirmed and still holds its stock
        expect(after.status).toBe("CONFIRMED")
        expect(stock).toBe(7)
      } else {
        // expired first: cancelled, stock returned, the late payment refunded
        expect(after).toMatchObject({
          status: "CANCELLED",
          paymentStatus: "REFUNDED",
        })
        expect(stock).toBe(10)
      }
    }
  )
})
