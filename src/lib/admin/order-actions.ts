import { env } from "@/env"
import type { Prisma } from "@/generated/prisma/client"
import { formatPrice } from "@/lib/catalog/format"
import { prisma } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/mailer"
import { orderStatusEmail } from "@/lib/email/templates"
import { logger } from "@/lib/logger"
import { restoreStock } from "@/lib/orders/stock"
import { expireSession } from "@/lib/payments/checkout"
import { refundPayment } from "@/lib/payments/refund"

import { actorOf, recordAudit } from "./audit"
import {
  availableActions,
  type AdminAction,
} from "./order-rules"

type Tx = Prisma.TransactionClient

export type Admin = {
  id: string
  name: string
  email: string
}

export type OrderChange =
  | {
      ok: true
      /** For a cancelled paid card order: was the money given back? */
      refund?: "refunded" | "owed"
    }
  | { ok: false; reason: "not-found" | "not-allowed" }

/** Reads an order with its row locked until the transaction ends. */
async function lockOrder(tx: Tx, number: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "order" WHERE number = ${number} FOR UPDATE
  `
  if (rows.length === 0) return null
  return tx.order.findUnique({
    where: { id: rows[0].id },
    include: { items: true },
  })
}

const SIMPLE_STEPS = {
  confirm: { to: "CONFIRMED", words: "confirmed" },
  ship: { to: "SHIPPED", words: "shipped" },
  deliver: { to: "DELIVERED", words: "delivered" },
} as const

/**
 * Moves an order one step forward: confirm, ship or deliver. Delivering a cash
 * order is when its money is collected, so that is when it becomes paid.
 */
export async function advanceOrder(
  admin: Admin,
  number: string,
  step: "confirm" | "ship" | "deliver"
): Promise<OrderChange> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, number)
    if (!order)
      return {
        ok: false as const,
        reason: "not-found" as const,
      }
    if (!availableActions(order).includes(step)) {
      return {
        ok: false as const,
        reason: "not-allowed" as const,
      }
    }

    const { to, words } = SIMPLE_STEPS[step]
    const collectsCash =
      step === "deliver" &&
      order.paymentMethod === "CASH_ON_DELIVERY" &&
      order.paymentStatus === "PENDING"

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: to,
        ...(collectsCash
          ? {
              paymentStatus: "PAID" as const,
              paidAt: new Date(),
            }
          : {}),
      },
    })
    await recordAudit(tx, {
      actor: actorOf(admin),
      action: `order.${step}`,
      targetType: "order",
      targetId: order.id,
      summary: collectsCash
        ? `${order.number} was ${words}, and the cash payment of ${formatPrice(order.totalCents)} was recorded`
        : `${order.number} was ${words}`,
    })
    return { ok: true as const, orderId: order.id, to }
  })

  if (!result.ok) return result
  if (
    result.to === "SHIPPED" ||
    result.to === "DELIVERED"
  ) {
    notify(result.orderId, result.to, null)
  }
  return { ok: true }
}

/**
 * Cancels an order that has not shipped. Its stock goes back; an unpaid card
 * order's payment page is closed; a paid card order is refunded. The refund is
 * a call to Stripe, so it happens after the cancel is saved: if it fails, the
 * order stays "cancelled but paid", which is exactly the state `retryRefund`
 * works from.
 */
export async function cancelAsAdmin(
  admin: Admin,
  number: string
): Promise<OrderChange> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, number)
    if (!order)
      return {
        ok: false as const,
        reason: "not-found" as const,
      }
    if (!availableActions(order).includes("cancel")) {
      return {
        ok: false as const,
        reason: "not-allowed" as const,
      }
    }

    const paidByCard =
      order.paymentMethod === "CARD" &&
      order.paymentStatus === "PAID"
    const unpaidCard =
      order.paymentMethod === "CARD" &&
      order.paymentStatus === "PENDING"

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        // an unpaid card order did not get paid; a paid one is settled below
        ...(unpaidCard
          ? { paymentStatus: "FAILED" as const }
          : {}),
      },
    })
    await restoreStock(tx, order.items)
    await recordAudit(tx, {
      actor: actorOf(admin),
      action: "order.cancel",
      targetType: "order",
      targetId: order.id,
      summary: paidByCard
        ? `${order.number} was cancelled; ${formatPrice(order.totalCents)} is to be refunded`
        : `${order.number} was cancelled`,
    })
    return {
      ok: true as const,
      orderId: order.id,
      sessionId: unpaidCard ? order.stripeSessionId : null,
      refundOf: paidByCard
        ? {
            cents: order.totalCents,
            intent: order.stripePaymentIntentId,
          }
        : null,
    }
  })

  if (!result.ok) return result
  if (result.sessionId)
    await expireSession(result.sessionId)

  let refund: "refunded" | "owed" | undefined
  if (result.refundOf) {
    refund = await completeRefund(admin, result.orderId)
  }
  notify(
    result.orderId,
    "CANCELLED",
    result.refundOf
      ? formatPrice(result.refundOf.cents)
      : null
  )
  return { ok: true, refund }
}

/** Tries again to give back the money of an order that was cancelled while paid. */
export async function retryRefund(
  admin: Admin,
  number: string
): Promise<OrderChange> {
  const order = await prisma.order.findUnique({
    where: { number },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
    },
  })
  if (!order) return { ok: false, reason: "not-found" }
  if (!availableActions(order).includes("refund")) {
    return { ok: false, reason: "not-allowed" }
  }
  return {
    ok: true,
    refund: await completeRefund(admin, order.id),
  }
}

/**
 * Gives a cancelled order's payment back and records it. A Stripe failure is
 * not an error to the caller: the order is left cancelled-but-paid, the refund
 * is reported as owed, and it can be retried.
 */
async function completeRefund(
  admin: Admin,
  orderId: string
): Promise<"refunded" | "owed"> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      totalCents: true,
      stripePaymentIntentId: true,
    },
  })
  if (!order.stripePaymentIntentId) {
    logger.error(
      `order ${order.number}: no payment to refund`
    )
    return "owed"
  }

  try {
    await refundPayment(
      order.id,
      order.stripePaymentIntentId
    )
  } catch (error) {
    logger.error(
      `order ${order.number}: refund failed`,
      error
    )
    return "owed"
  }

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "order" WHERE id = ${order.id} FOR UPDATE`
    // only the first call changes anything, so the log has one entry per refund
    const { count } = await tx.order.updateMany({
      where: { id: order.id, paymentStatus: "PAID" },
      data: {
        paymentStatus: "REFUNDED",
        refundedAt: new Date(),
      },
    })
    if (count === 0) return
    await recordAudit(tx, {
      actor: actorOf(admin),
      action: "order.refund",
      targetType: "order",
      targetId: order.id,
      summary: `${order.number} was refunded ${formatPrice(order.totalCents)}`,
    })
  })
  return "refunded"
}

/** Emails the customer after the change is saved. A mail failure is logged and changes nothing. */
function notify(
  orderId: string,
  status: "SHIPPED" | "DELIVERED" | "CANCELLED",
  refund: string | null
) {
  void (async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        number: true,
        user: { select: { name: true, email: true } },
      },
    })
    // an account deleted in the meantime has nobody to tell
    if (!order?.user) return
    await sendEmail({
      to: order.user.email,
      ...orderStatusEmail({
        name: order.user.name,
        number: order.number,
        status,
        url: `${env.NEXT_PUBLIC_APP_URL}/account/orders/${order.number}`,
        refund,
      }),
    })
  })().catch((error) =>
    logger.error("order status email failed", error)
  )
}

export type { AdminAction }
