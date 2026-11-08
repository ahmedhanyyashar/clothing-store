"use server"

import { requireUser } from "@/lib/auth/session"

import { cancelOrder, type CancelResult } from "./cancel"
import { sendOrderConfirmation } from "./email"
import { placeOrder, type LineProblem } from "./place"
import { placeOrderSchema } from "./validations"

export type PlaceOrderActionResult =
  | { ok: true; number: string }
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

  // A repeated attempt returns the same order: it was already confirmed.
  // Not awaited: a slow mail server must not hold up the customer.
  if (!result.reused) {
    void sendOrderConfirmation(result.orderId).catch(
      (error) =>
        console.error(
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
  return cancelOrder(user.id, number)
}
