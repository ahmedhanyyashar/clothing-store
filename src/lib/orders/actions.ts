"use server"

import { requireUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { logger } from "@/lib/logger"
import {
  expireSession,
  paymentUrlFor,
} from "@/lib/payments/checkout"
import { abandonCardOrder } from "@/lib/payments/unpaid"

import { cancelOrder, type CancelResult } from "./cancel"
import { sendOrderConfirmation } from "./email"
import { placeOrder, type LineProblem } from "./place"
import { placeOrderSchema } from "./validations"

export type PlaceOrderActionResult =
  | {
      ok: true
      number: string
      /** Set for a card order: the Stripe page where it is paid. */
      redirectUrl?: string
    }
  | {
      ok: false
      /** A problem with the request as a whole */
      message?: string
      /** Lines that cannot be bought as asked, for the checkout to show */
      problems?: LineProblem[]
    }

// Every action checks the user itself: calling one is a plain POST that
// anyone can send, whatever page it was meant for.

export async function placeOrderAction(
  input: unknown
): Promise<PlaceOrderActionResult> {
  const user = await requireUser("/checkout")

  // the browser's form is not a guarantee: this is the check that counts
  const parsed = placeOrderSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Invalid order.",
    }
  }

  const result = await placeOrder({
    userId: user.id,
    ...parsed.data,
  })
  if (!result.ok) {
    return result.reason === "address-not-found"
      ? { ok: false, message: "Choose a delivery address." }
      : { ok: false, problems: result.problems }
  }

  if (parsed.data.paymentMethod === "CARD") {
    // The order exists and holds its stock; now the shopper pays for it.
    const payment = await paymentUrlFor(result.orderId)
    if (payment.ok) {
      return {
        ok: true,
        number: result.number,
        redirectUrl: payment.url,
      }
    }
    // Already paid or closed (a repeated request): the order page tells them.
    if (payment.reason === "not-payable") {
      return { ok: true, number: result.number }
    }
    // The payment page could not be opened, so nothing should stay reserved.
    if (!result.reused)
      await abandonCardOrder(result.orderId)
    return {
      ok: false,
      message:
        "We could not start the payment. Nothing was charged and your items were released. Please try again.",
    }
  }

  // A repeated attempt returns the same order: it was already confirmed.
  // Not awaited: a slow mail server must not hold up the customer.
  if (!result.reused) {
    void sendOrderConfirmation(result.orderId).catch(
      (error) =>
        logger.error(
          "order confirmation email failed",
          error
        )
    )
  }
  return { ok: true, number: result.number }
}

export async function cancelOrderAction(
  number: string
): Promise<CancelResult> {
  const user = await requireUser("/account/orders")
  const result = await cancelOrder(user.id, number)

  if (result === "cancelled") {
    // close the payment page too, so the order cannot be paid afterwards
    const order = await prisma.order.findFirst({
      where: { userId: user.id, number },
      select: { stripeSessionId: true },
    })
    if (order?.stripeSessionId)
      await expireSession(order.stripeSessionId)
  }
  return result
}
