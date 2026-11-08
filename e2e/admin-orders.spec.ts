import { randomUUID } from "node:crypto"

import type { Page } from "@playwright/test"

import { adminCommand } from "./support/admin"
import {
  createSignedInUser,
  open,
  signOut,
} from "./support/flows"
import { waitForLink } from "./support/mailpit"
import {
  placeCashOrder,
  readyToCheckOut,
} from "./support/shop"
import {
  newestOrderNumber,
  sendStripeEvent,
  stubStripePage,
} from "./support/stripe"
import { expect, test, type Account } from "./support/test"

/** Signs the current user out and signs in a new one who has been made an admin. */
async function switchToAdmin(
  page: Page,
  customer: Account
) {
  await signOut(page)
  const admin = {
    ...customer,
    name: "Ada Admin",
    email: `e2e-admin-${randomUUID().slice(0, 8)}@example.com`,
  }
  await createSignedInUser(page, admin)
  expect(adminCommand("grant", admin.email).status).toBe(0)
  return admin
}

/** Finds an order in the admin list by its number and opens it. */
async function openInAdmin(page: Page, number: string) {
  await open(page, "/admin/orders")
  await page
    .getByLabel("Order number, name or email")
    .fill(number)
  await page.getByRole("button", { name: "Filter" }).click()
  await expect(
    page.getByRole("row", { name: new RegExp(number) })
  ).toBeVisible()
  await page.getByRole("link", { name: number }).click()
  await expect(
    page.getByRole("heading", { name: `Order ${number}` })
  ).toBeVisible()
  // the buttons only work once the page has loaded its scripts
  await page.waitForLoadState("networkidle")
}

test("an admin takes a cash order from confirmation to delivery, and the customer is told", async ({
  page,
  account,
}) => {
  await readyToCheckOut(page, account)
  const number = await placeCashOrder(page)
  const admin = await switchToAdmin(page, account)

  await openInAdmin(page, number)
  await expect(
    page.getByText("To pay on delivery")
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Confirm order" })
    .click()
  await expect(
    page.getByText("The order is confirmed.")
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Mark as shipped" })
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Mark as shipped" })
    .click()
  await expect(
    page.getByRole("button", { name: "Mark as delivered" })
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Mark as delivered" })
    .click()
  await expect(
    page.getByText(
      "Nothing more can be done to this order."
    )
  ).toBeVisible()
  // delivering a cash order is when its money is collected
  await expect(
    page.getByText("Paid", { exact: true }).first()
  ).toBeVisible()

  // every step is in the order's history, under the admin's name
  const history = page
    .getByRole("heading", { name: "History" })
    .locator("../../..")
  for (const words of [
    "was confirmed",
    "was shipped",
    "was delivered",
  ]) {
    await expect(
      history.getByText(new RegExp(`${number} ${words}`))
    ).toBeVisible()
  }
  await expect(
    history.getByText(admin.email).first()
  ).toBeVisible()

  // the customer got the two emails that matter
  await waitForLink(account.email, /has shipped/)
  await waitForLink(account.email, /was delivered/)
})

test("an admin cancels a paid card order and the customer is refunded", async ({
  page,
  request,
  account,
}) => {
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
  const paid = await sendStripeEvent(
    request,
    "checkout.session.completed",
    {
      number,
      totalCents: 2999,
    }
  )
  expect(paid.status()).toBe(200)

  await switchToAdmin(page, account)
  await openInAdmin(page, number)
  await expect(
    page.getByText("Confirmed").first()
  ).toBeVisible()
  // a paid card order is confirmed by its payment: there is nothing to confirm by hand
  await expect(
    page.getByRole("button", { name: "Confirm order" })
  ).toHaveCount(0)

  await page
    .getByRole("button", { name: "Cancel order" })
    .click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText("$29.99 is refunded")
  await dialog
    .getByRole("button", { name: "Cancel order" })
    .click()

  await expect(
    page.getByText(/the payment was refunded/)
  ).toBeVisible()
  await expect(
    page.getByText("Refunded", { exact: true }).first()
  ).toBeVisible()
  await expect(
    page.getByText("Cancelled").first()
  ).toBeVisible()
  const history = page
    .getByRole("heading", { name: "History" })
    .locator("../../..")
  await expect(
    history.getByText(new RegExp(`${number} was cancelled`))
  ).toBeVisible()
  await expect(
    history.getByText(
      new RegExp(`${number} was refunded \\$29.99`)
    )
  ).toBeVisible()

  await waitForLink(account.email, /was cancelled/)
})

test("the order pages are for admins only", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)

  for (const path of [
    "/admin/orders",
    "/admin/orders/CS-ABCDEFGH",
  ]) {
    expect((await page.goto(path))?.status()).toBe(404)
  }
})
