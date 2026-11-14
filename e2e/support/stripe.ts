import { randomUUID } from "node:crypto"

import type {
  APIRequestContext,
  Page,
} from "@playwright/test"
import Stripe from "stripe"

import { env } from "@/env"

import { open } from "./flows"
import { expect } from "./test"

// Only used to sign test events; it never talks to Stripe.
const signer = new Stripe("sk_test_mock")

/**
 * The browser is sent to checkout.stripe.com. The tests never reach it: the
 * page is replaced by a plain one, and "paying" is a signed event posted to the
 * app, exactly as Stripe would send it.
 */
export async function stubStripePage(page: Page) {
  await page.route(
    "https://checkout.stripe.com/**",
    (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<h1>Stripe test payment page</h1>",
      })
  )
}

/** Sends the app a Stripe event for an order, signed with the test secret. */
export async function sendStripeEvent(
  request: APIRequestContext,
  type: string,
  order: { number: string; totalCents: number },
  session: Record<string, unknown> = {}
) {
  const payload = JSON.stringify({
    id: `evt_${randomUUID()}`,
    object: "event",
    type,
    data: {
      object: {
        id: `cs_test_${randomUUID()}`,
        object: "checkout.session",
        client_reference_id: order.number,
        payment_status: "paid",
        amount_total: order.totalCents,
        currency: "usd",
        payment_intent: `pi_${randomUUID()}`,
        ...session,
      },
    },
  })
  const signature =
    signer.webhooks.generateTestHeaderString({
      payload,
      secret: env.STRIPE_WEBHOOK_SECRET,
    })
  return request.post("/api/webhooks/stripe", {
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
  })
}

/** The number of the newest order of the signed-in user. */
export async function newestOrderNumber(page: Page) {
  await open(page, "/account/orders")
  const text = await page
    .getByRole("link", { name: /CS-[A-Z0-9]{8}/ })
    .first()
    .innerText()
  const number = text.match(/CS-[A-Z0-9]{8}/)?.[0]
  expect(number).toBeTruthy()
  return number!
}
