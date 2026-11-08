import type {
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/enums"

// The compiler rejects a method or a status without an entry.
export const PAYMENT_METHOD_LABEL: Record<
  PaymentMethod,
  string
> = {
  CARD: "Card",
  CASH_ON_DELIVERY: "Cash on delivery",
}

const STATUS_LABEL: Record<
  PaymentMethod,
  Record<PaymentStatus, string>
> = {
  CARD: {
    PENDING: "Awaiting payment",
    PAID: "Paid",
    FAILED: "Not paid",
    REFUNDED: "Refunded",
  },
  CASH_ON_DELIVERY: {
    PENDING: "To pay on delivery",
    PAID: "Paid",
    FAILED: "Not paid",
    REFUNDED: "Refunded",
  },
}

export function paymentStatusLabel(
  method: PaymentMethod,
  status: PaymentStatus
) {
  return STATUS_LABEL[method][status]
}

/** A card order the shopper can still pay: placed, unpaid and not cancelled. */
export function isAwaitingCardPayment(order: {
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  status: string
}) {
  return (
    order.paymentMethod === "CARD" &&
    order.paymentStatus === "PENDING" &&
    order.status === "PENDING"
  )
}
