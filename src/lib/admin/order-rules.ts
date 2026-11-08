import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/enums"
import { canTransition } from "@/lib/orders/status"

export const ADMIN_ACTIONS = [
  "confirm",
  "ship",
  "deliver",
  "cancel",
  "refund",
] as const

export type AdminAction = (typeof ADMIN_ACTIONS)[number]

type OrderState = {
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
}

/**
 * What an admin may do to an order right now. The screen shows exactly these
 * buttons and the server allows exactly these actions, so the two cannot
 * disagree.
 */
export function availableActions(
  order: OrderState
): AdminAction[] {
  const actions: AdminAction[] = []

  if (
    canTransition(order.status, "CONFIRMED") &&
    // a card order is confirmed by its payment, never by hand
    (order.paymentMethod !== "CARD" ||
      order.paymentStatus === "PAID")
  ) {
    actions.push("confirm")
  }
  if (canTransition(order.status, "SHIPPED"))
    actions.push("ship")
  if (canTransition(order.status, "DELIVERED"))
    actions.push("deliver")
  if (canTransition(order.status, "CANCELLED"))
    actions.push("cancel")
  // cancelled, but the customer's money has not been given back yet
  if (
    order.status === "CANCELLED" &&
    order.paymentStatus === "PAID"
  ) {
    actions.push("refund")
  }
  return actions
}

export const ACTION_LABEL: Record<AdminAction, string> = {
  confirm: "Confirm order",
  ship: "Mark as shipped",
  deliver: "Mark as delivered",
  cancel: "Cancel order",
  refund: "Retry refund",
}
