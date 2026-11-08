import type Stripe from "stripe"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"

import { CURRENCY, stripe } from "./stripe"
import { cancelUnpaidOrder } from "./unpaid"

type Tx = Prisma.TransactionClient

/** A payment arrived for a different amount than the order costs. Retrying cannot fix it. */
export class PaymentMismatchError extends Error {}

export type WebhookResult =
  | { outcome: "ignored" | "duplicate" | "processed" }
  /** The order was paid just now: the caller can tell the customer. */
  | { outcome: "paid"; orderId: string }

const PAID_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
])
const UNPAID_EVENTS = new Set([
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
])

type Effect = {
  paidOrderId?: string
  /** Money arrived for an order that was already cancelled: give it back. */
  refund?: { orderId: string; paymentIntentId: string }
}

/**
 * Applies one Stripe event to the order it is about.
 *
 * Stripe sends an event at least once and again if we answer with an error, so
 * handling it twice must change nothing:
 * - the event id is stored with its effects, in one transaction, and a lock on
 *   the id makes two copies arriving together take turns;
 * - the order row is locked while it is read and changed, so a payment and an
 *   expiry for the same order cannot interleave.
 *
 * The one thing that cannot live in the transaction is the refund (it is a call
 * to Stripe). For that case the event is marked handled only after the refund
 * succeeded, so a failure is retried instead of leaving a customer charged for
 * an order they do not have.
 */
export async function handleStripeEvent(
  event: Stripe.Event
): Promise<WebhookResult> {
  if (
    !PAID_EVENTS.has(event.type) &&
    !UNPAID_EVENTS.has(event.type)
  ) {
    return { outcome: "ignored" }
  }
  const session = event.data
    .object as Stripe.Checkout.Session

  const first = await prisma.$transaction(async (tx) => {
    await lock(tx, event.id)
    if (
      await tx.stripeEvent.findUnique({
        where: { id: event.id },
      })
    ) {
      return { duplicate: true as const }
    }

    const effect = PAID_EVENTS.has(event.type)
      ? await applyPayment(tx, session)
      : await applyExpiry(tx, session)

    // a refund still has to happen: not handled yet
    if (!effect.refund) {
      await tx.stripeEvent.create({
        data: { id: event.id, type: event.type },
      })
    }
    return { duplicate: false as const, effect }
  })

  if (first.duplicate) return { outcome: "duplicate" }
  const { effect } = first

  if (effect.refund) {
    const { orderId, paymentIntentId } = effect.refund
    // the same key every time, so a retry cannot refund twice
    await stripe.refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey: `refund-${orderId}` }
    )
    await prisma.$transaction(async (tx) => {
      await lock(tx, event.id)
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "REFUNDED",
          refundedAt: new Date(),
        },
      })
      await tx.stripeEvent.createMany({
        data: { id: event.id, type: event.type },
        skipDuplicates: true,
      })
    })
    return { outcome: "processed" }
  }

  return effect.paidOrderId
    ? { outcome: "paid", orderId: effect.paidOrderId }
    : { outcome: "processed" }
}

function lock(tx: Tx, key: string) {
  return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
}

/** The order a session belongs to, locked for the rest of the transaction. */
async function lockOrder(
  tx: Tx,
  session: Stripe.Checkout.Session
) {
  const number =
    session.client_reference_id ??
    session.metadata?.orderNumber
  if (!number) return null

  // FOR UPDATE: anything else changing this order waits until we are done
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "order" WHERE number = ${number} FOR UPDATE
  `
  if (rows.length === 0) return null
  return tx.order.findUnique({
    where: { id: rows[0].id },
    include: { items: true },
  })
}

async function applyPayment(
  tx: Tx,
  session: Stripe.Checkout.Session
): Promise<Effect> {
  // some payment methods complete the session before the money has arrived;
  // a later async_payment_succeeded event says when it has
  if (session.payment_status !== "paid") return {}

  const order = await lockOrder(tx, session)
  // not one of ours, or card-less: nothing to do, and retrying will not help
  if (!order || order.paymentMethod !== "CARD") return {}

  if (
    session.amount_total !== order.totalCents ||
    session.currency !== CURRENCY
  ) {
    throw new PaymentMismatchError(
      `order ${order.number}: paid ${session.amount_total} ${session.currency}, expected ${order.totalCents} ${CURRENCY}`
    )
  }
  // Already settled: nothing to do. A cancelled order that is marked paid is
  // not settled, though: its refund is still owed, whichever copy of the event
  // finds it first.
  if (order.paymentStatus === "REFUNDED") return {}
  if (
    order.paymentStatus === "PAID" &&
    order.status !== "CANCELLED"
  )
    return {}

  const paymentIntentId =
    (typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id) ??
    order.stripePaymentIntentId ??
    null

  if (order.status === "CANCELLED") {
    // The shopper paid after the order was cancelled or expired. Record the
    // payment, then give it back.
    if (!paymentIntentId) {
      throw new Error(
        `order ${order.number}: paid without a payment intent`
      )
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
      },
    })
    return {
      refund: { orderId: order.id, paymentIntentId },
    }
  }

  await tx.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
      // paying is what confirms a card order
      status:
        order.status === "PENDING"
          ? "CONFIRMED"
          : order.status,
    },
  })
  return { paidOrderId: order.id }
}

async function applyExpiry(
  tx: Tx,
  session: Stripe.Checkout.Session
): Promise<Effect> {
  const order = await lockOrder(tx, session)
  if (!order || order.paymentMethod !== "CARD") return {}

  // only an order still waiting for its payment is given up on
  await cancelUnpaidOrder(tx, order)
  return {}
}
