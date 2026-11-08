import { open } from "./support/flows"
import { waitForLink } from "./support/mailpit"
import { readyToCheckOut } from "./support/shop"
import {
  newestOrderNumber,
  sendStripeEvent,
  stubStripePage,
} from "./support/stripe"
import { expect, test } from "./support/test"

// One Classic White Tee in size S: $24.99 plus $5.00 shipping.
const ORDER_TOTAL_CENTS = 2999

/** Checks out by card and arrives on the (stubbed) Stripe page. */
async function startCardPayment(
  page: Parameters<typeof stubStripePage>[0],
  account: Parameters<typeof readyToCheckOut>[1]
) {
  await stubStripePage(page)
  await readyToCheckOut(page, account)
  await page
    .getByRole("button", { name: "Pay by card" })
    .click()
  await expect(
    page.getByRole("heading", {
      name: "Stripe test payment page",
    })
  ).toBeVisible()
  const number = await newestOrderNumber(page)
  return {
    number,
    order: { number, totalCents: ORDER_TOTAL_CENTS },
  }
}

test("a shopper pays by card and the confirmation comes from Stripe, not the browser", async ({
  page,
  request,
  account,
}) => {
  const { number, order } = await startCardPayment(
    page,
    account
  )

  // the cart was emptied when the order was made, before any payment
  await expect(
    page.getByRole("button", { name: "Cart", exact: true })
  ).toBeVisible()

  // coming back from Stripe without a confirmation does not confirm anything
  await open(page, `/account/orders/${number}?paid=1`)
  await expect(
    page.getByText("Confirming your payment")
  ).toBeVisible()
  await expect(
    page.getByText("Awaiting payment")
  ).toBeVisible()

  const response = await sendStripeEvent(
    request,
    "checkout.session.completed",
    order
  )
  expect(response.status()).toBe(200)

  // the page asks again by itself and shows the result
  await expect(
    page.getByText("Payment received. Thank you!")
  ).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText("Card · Paid")).toBeVisible()
  await expect(
    page.getByText("Confirmed").first()
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Cancel order" })
  ).toHaveCount(0)

  const link = await waitForLink(
    account.email,
    new RegExp(`order ${number}`)
  )
  expect(link).toContain(`/account/orders/${number}`)
})

test("an unpaid card order can be paid later from its page", async ({
  page,
  account,
}) => {
  const { number } = await startCardPayment(page, account)

  await open(page, `/account/orders/${number}`)
  await expect(
    page.getByText("This order is waiting for its payment.")
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Pay now" })
    .click()

  await expect(
    page.getByRole("heading", {
      name: "Stripe test payment page",
    })
  ).toBeVisible()
})

test("an order that is not paid in time is cancelled, and a payment after that is refunded", async ({
  page,
  request,
  account,
}) => {
  const { number, order } = await startCardPayment(
    page,
    account
  )

  await sendStripeEvent(
    request,
    "checkout.session.expired",
    order,
    {
      payment_status: "unpaid",
    }
  )
  await open(page, `/account/orders/${number}`)
  await expect(
    page.getByText("This order was cancelled.")
  ).toBeVisible()
  await expect(
    page.getByText("Card · Not paid")
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Pay now" })
  ).toHaveCount(0)

  const late = await sendStripeEvent(
    request,
    "checkout.session.completed",
    order
  )
  expect(late.status()).toBe(200)
  await open(page, `/account/orders/${number}`)
  await expect(
    page.getByText("Card · Refunded")
  ).toBeVisible()
  // still cancelled: the late payment did not bring the order back
  await expect(
    page.getByText("This order was cancelled.")
  ).toBeVisible()
})

test("a shopper cancels an unpaid card order", async ({
  page,
  account,
}) => {
  const { number } = await startCardPayment(page, account)

  await open(page, `/account/orders/${number}`)
  await page
    .getByRole("button", { name: "Cancel order" })
    .click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel order" })
    .click()

  await expect(
    page.getByText("This order was cancelled.")
  ).toBeVisible()
  await expect(
    page.getByText("Card · Not paid")
  ).toBeVisible()
})

test("a payment for the wrong amount does not confirm the order", async ({
  page,
  request,
  account,
}) => {
  const { number, order } = await startCardPayment(
    page,
    account
  )

  const response = await sendStripeEvent(
    request,
    "checkout.session.completed",
    order,
    // the session says it was paid, but for another amount than the order
    { amount_total: 1 }
  )
  expect(response.status()).toBe(200)

  await open(page, `/account/orders/${number}`)
  await expect(
    page.getByText("Card · Awaiting payment")
  ).toBeVisible()
})

test("the webhook refuses requests that are not signed by Stripe", async ({
  request,
}) => {
  const unsigned = await request.post(
    "/api/webhooks/stripe",
    {
      data: "{}",
    }
  )
  expect(unsigned.status()).toBe(400)

  const forged = await request.post(
    "/api/webhooks/stripe",
    {
      data: "{}",
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
    }
  )
  expect(forged.status()).toBe(400)
})
