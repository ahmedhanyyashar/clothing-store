import { stripe } from "./stripe"

/**
 * Gives a card payment back, in full. The key is the same for the same order
 * every time, so asking again after a failure or a crash refunds once.
 */
export function refundPayment(
  orderId: string,
  paymentIntentId: string
) {
  return stripe.refunds.create(
    { payment_intent: paymentIntentId },
    { idempotencyKey: `refund-${orderId}` }
  )
}
