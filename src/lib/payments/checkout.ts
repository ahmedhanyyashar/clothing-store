import type Stripe from "stripe"

import { env } from "@/env"
import { prisma } from "@/lib/db/client"

import { CURRENCY, stripe } from "./stripe"

// Stripe's lowest allowed lifetime for a session is 30 minutes. The order holds
// its stock for that long and no longer if the shopper walks away.
const SESSION_MINUTES = 31

export type PaymentUrlResult =
  | { ok: true; url: string }
  /** The order is not waiting for a payment (paid, cancelled, or not by card). */
  | { ok: false; reason: "not-payable" }
  /** Stripe could not be reached or refused the request. */
  | { ok: false; reason: "unavailable" }

type PayableOrder = {
  id: string
  number: string
  shippingCents: number
  user: { email: string } | null
  items: {
    name: string
    size: string
    imageUrl: string | null
    unitPriceCents: number
    quantity: number
  }[]
}

/** Stripe fetches product images itself, so they must be public: https only. */
function imageFor(path: string | null) {
  if (!path) return undefined
  const base = new URL(env.NEXT_PUBLIC_APP_URL)
  return base.protocol === "https:"
    ? [new URL(path, base).toString()]
    : undefined
}

function sessionParams(
  order: PayableOrder
): Stripe.Checkout.SessionCreateParams {
  const app = env.NEXT_PUBLIC_APP_URL
  return {
    mode: "payment",
    // How the webhook finds the order again. Names and prices below are the
    // order's own copies, never the product's current ones.
    client_reference_id: order.number,
    metadata: {
      orderId: order.id,
      orderNumber: order.number,
    },
    payment_intent_data: {
      metadata: { orderNumber: order.number },
    },
    customer_email: order.user?.email,
    line_items: order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: CURRENCY,
        unit_amount: item.unitPriceCents,
        product_data: {
          name: item.name,
          description: `Size ${item.size}`,
          images: imageFor(item.imageUrl),
        },
      },
    })),
    shipping_options:
      order.shippingCents > 0
        ? [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                display_name: "Shipping",
                fixed_amount: {
                  amount: order.shippingCents,
                  currency: CURRENCY,
                },
              },
            },
          ]
        : undefined,
    expires_at:
      Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
    success_url: `${app}/account/orders/${order.number}?paid=1`,
    cancel_url: `${app}/account/orders/${order.number}`,
  }
}

/**
 * The Stripe page where this card order can be paid: the open session if there
 * is one, a new one if the order has none yet. Asking again returns the same
 * page, so a retry or a "Pay now" never makes a second session.
 */
export async function paymentUrlFor(
  orderId: string
): Promise<PaymentUrlResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      stripeSessionId: true,
      shippingCents: true,
      user: { select: { email: true } },
      items: {
        select: {
          name: true,
          size: true,
          imageUrl: true,
          unitPriceCents: true,
          quantity: true,
        },
        orderBy: { id: "asc" },
      },
    },
  })
  if (
    !order ||
    order.paymentMethod !== "CARD" ||
    order.status !== "PENDING" ||
    order.paymentStatus !== "PENDING"
  ) {
    return { ok: false, reason: "not-payable" }
  }

  try {
    if (order.stripeSessionId) {
      const session =
        await stripe.checkout.sessions.retrieve(
          order.stripeSessionId
        )
      return session.status === "open" && session.url
        ? { ok: true, url: session.url }
        : { ok: false, reason: "not-payable" }
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams(order),
      {
        // the same key for the same order: a repeat gets the same session back
        idempotencyKey: `checkout-${order.id}`,
      }
    )
    if (!session.url)
      return { ok: false, reason: "unavailable" }

    // If another request saved a session first, keep that one.
    await prisma.order.updateMany({
      where: { id: order.id, stripeSessionId: null },
      data: { stripeSessionId: session.id },
    })
    return { ok: true, url: session.url }
  } catch (error) {
    console.error("could not start the payment", error)
    return { ok: false, reason: "unavailable" }
  }
}

/**
 * Closes the payment page of an order that was cancelled, so the shopper cannot
 * pay for it afterwards. A failure is harmless: a payment that still arrives is
 * refunded.
 */
export async function expireSession(sessionId: string) {
  try {
    await stripe.checkout.sessions.expire(sessionId)
  } catch (error) {
    console.error("could not close the payment page", error)
  }
}
