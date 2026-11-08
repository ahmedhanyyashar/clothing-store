"use server"

import { requireUser } from "@/lib/auth/session"

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
  return { ok: true, number: result.number }
}
