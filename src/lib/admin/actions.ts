"use server"

import { requireRole } from "@/lib/auth/session"
import { ORDER_NUMBER_PATTERN } from "@/lib/orders/number"

import {
  advanceOrder,
  cancelAsAdmin,
  retryRefund,
  type OrderChange,
} from "./order-actions"
import {
  ADMIN_ACTIONS,
  type AdminAction,
} from "./order-rules"

export type OrderActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

const DONE: Record<AdminAction, string> = {
  confirm: "The order is confirmed.",
  ship: "The order is marked as shipped, and the customer was told.",
  deliver: "The order is marked as delivered.",
  cancel:
    "The order is cancelled and its items are back on sale.",
  refund: "The refund was made.",
}

function describe(
  action: AdminAction,
  change: OrderChange
): OrderActionResult {
  if (!change.ok) {
    return {
      ok: false,
      message:
        change.reason === "not-found"
          ? "That order does not exist."
          : "That cannot be done to this order any more. Reload the page to see where it stands.",
    }
  }
  if (change.refund === "owed") {
    return {
      ok: false,
      message:
        "The order is cancelled, but the refund did not go through. Try the refund again.",
    }
  }
  if (action === "cancel" && change.refund === "refunded") {
    return {
      ok: true,
      message:
        "The order is cancelled, its items are back on sale and the payment was refunded.",
    }
  }
  return { ok: true, message: DONE[action] }
}

// Every action checks the admin itself: calling one is a plain POST that
// anyone can send, whatever page it was meant for.

/** One step on an order: confirm, ship, deliver, cancel, or retry a refund. */
export async function orderAction(
  number: string,
  action: string
): Promise<OrderActionResult> {
  const admin = await requireRole(
    "ADMIN",
    `/admin/orders/${number}`
  )

  if (
    !ORDER_NUMBER_PATTERN.test(number) ||
    !(ADMIN_ACTIONS as readonly string[]).includes(action)
  ) {
    return {
      ok: false,
      message: "That is not a valid request.",
    }
  }
  const step = action as AdminAction

  const change =
    step === "cancel"
      ? await cancelAsAdmin(admin, number)
      : step === "refund"
        ? await retryRefund(admin, number)
        : await advanceOrder(admin, number, step)
  return describe(step, change)
}
