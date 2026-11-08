"use server"

import { requireUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { ORDER_NUMBER_PATTERN } from "@/lib/orders/number"

import { paymentUrlFor } from "./checkout"

export type ResumePaymentResult =
  { ok: true; url: string } | { ok: false; message: string }

/** "Pay now" on an order that is waiting for its card payment. */
export async function resumePaymentAction(
  number: string
): Promise<ResumePaymentResult> {
  const user = await requireUser(
    `/account/orders/${number}`
  )
  if (!ORDER_NUMBER_PATTERN.test(number)) {
    return {
      ok: false,
      message: "We could not find that order.",
    }
  }

  // someone else's order is the same as one that does not exist
  const order = await prisma.order.findFirst({
    where: { userId: user.id, number },
    select: { id: true },
  })
  if (!order)
    return {
      ok: false,
      message: "We could not find that order.",
    }

  const result = await paymentUrlFor(order.id)
  if (result.ok) return result
  return {
    ok: false,
    message:
      result.reason === "not-payable"
        ? "This order can no longer be paid."
        : "We could not reach the payment page. Try again in a moment.",
  }
}
