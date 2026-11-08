import { NextResponse } from "next/server"

import { env } from "@/env"
import { logger } from "@/lib/logger"
import { sendOrderConfirmation } from "@/lib/orders/email"
import { stripe } from "@/lib/payments/stripe"
import {
  handleStripeEvent,
  PaymentMismatchError,
} from "@/lib/payments/webhook"

// The signature is the only authentication: Stripe signs the exact bytes of the
// body, so it is read as text and never parsed before it is verified.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    )
  }

  const body = await request.text()
  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  try {
    const result = await handleStripeEvent(event)
    // Paying is what confirms a card order, so this is when the customer is
    // told. Not awaited: Stripe should get its answer without waiting for mail.
    if (result.outcome === "paid") {
      void sendOrderConfirmation(result.orderId).catch(
        (error) =>
          logger.error(
            "order confirmation email failed",
            error
          )
      )
    }
  } catch (error) {
    // Answering with an error makes Stripe send the event again for days. That
    // helps when something was briefly unavailable, never for a wrong amount.
    if (error instanceof PaymentMismatchError) {
      logger.error(
        "stripe payment did not match its order",
        error
      )
      return NextResponse.json({ received: true })
    }
    logger.error("stripe webhook failed", error)
    return NextResponse.json(
      { error: "Failed" },
      { status: 500 }
    )
  }
  return NextResponse.json({ received: true })
}
