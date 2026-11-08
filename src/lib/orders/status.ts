import type { OrderStatus } from "@/generated/prisma/enums"

// The compiler rejects a status without an entry in either table.
export const ORDER_STATUS_INFO: Record<
  OrderStatus,
  { label: string; description: string }
> = {
  PENDING: {
    label: "Pending",
    description:
      "We received your order and will confirm it soon.",
  },
  CONFIRMED: {
    label: "Confirmed",
    description:
      "Your order is confirmed and being prepared.",
  },
  SHIPPED: {
    label: "Shipped",
    description: "Your order is on its way.",
  },
  DELIVERED: {
    label: "Delivered",
    description: "Your order was delivered.",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This order was cancelled.",
  },
}

/** Where an order may go next. An order never moves backwards. */
export const ORDER_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus
) {
  return ORDER_TRANSITIONS[from].includes(to)
}

/** An order that still has to be fulfilled: its stock is held and its address is needed. */
export const ACTIVE_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
] as const satisfies readonly OrderStatus[]

/** The customer can cancel until the order is confirmed; after that it takes a person. */
export const CUSTOMER_CANCELLABLE = [
  "PENDING",
] as const satisfies readonly OrderStatus[]

export function canCustomerCancel(status: OrderStatus) {
  return (
    CUSTOMER_CANCELLABLE as readonly OrderStatus[]
  ).includes(status)
}
