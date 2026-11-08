import Stripe from "stripe"

import { env } from "@/env"

/** Every card payment is in this currency, and so is every price. */
export const CURRENCY = "usd"

function createClient() {
  const options = { maxNetworkRetries: 2 }
  if (!env.STRIPE_API_URL)
    return new Stripe(env.STRIPE_SECRET_KEY, options)

  // a stand-in server (stripe-mock) for tests and offline work
  const url = new URL(env.STRIPE_API_URL)
  return new Stripe(env.STRIPE_SECRET_KEY, {
    ...options,
    host: url.hostname,
    port: url.port,
    protocol: url.protocol === "https:" ? "https" : "http",
  })
}

export const stripe = createClient()
