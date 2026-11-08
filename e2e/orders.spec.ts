import { randomUUID } from "node:crypto"

import {
  createSignedInUser,
  open,
  signOut,
} from "./support/flows"
import { waitForLink } from "./support/mailpit"
import {
  placeOrderFromCheckout,
  readyToCheckOut,
} from "./support/shop"
import { expect, test } from "./support/test"

test("a placed order is emailed and listed in the history", async ({
  page,
  account,
}) => {
  await readyToCheckOut(page, account)
  const number = await placeOrderFromCheckout(page)

  const link = await waitForLink(
    account.email,
    new RegExp(`order ${number}`)
  )
  expect(link).toContain(`/account/orders/${number}`)

  await open(page, "/account/orders")
  await expect(
    page.getByRole("link", { name: new RegExp(number) })
  ).toContainText("Pending")
})

test("a shopper cancels a pending order", async ({
  page,
  account,
}) => {
  await readyToCheckOut(page, account)
  const number = await placeOrderFromCheckout(page)

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
    page.getByRole("button", { name: "Cancel order" })
  ).toHaveCount(0)

  await open(page, "/account/orders")
  await expect(
    page.getByRole("link", { name: new RegExp(number) })
  ).toContainText("Cancelled")
})

test("one user cannot open another user's order", async ({
  page,
  account,
}) => {
  await readyToCheckOut(page, account)
  const number = await placeOrderFromCheckout(page)
  await signOut(page)

  await createSignedInUser(page, {
    ...account,
    email: `e2e-${randomUUID().slice(0, 8)}@example.com`,
  })
  const response = await page.goto(
    `/account/orders/${number}`
  )

  expect(response?.status()).toBe(404)
  await expect(
    page.getByText("Page not found")
  ).toBeVisible()
})

test("an account with an order on its way cannot be deleted until the order is done", async ({
  page,
  account,
}) => {
  await readyToCheckOut(page, account)
  const number = await placeOrderFromCheckout(page)

  await open(page, "/account/security")
  await page
    .getByRole("button", { name: "Delete account" })
    .click()
  const dialog = page.getByRole("alertdialog")
  await dialog
    .getByLabel("Enter your password to confirm")
    .fill(account.password)
  await dialog
    .getByRole("button", { name: "Delete my account" })
    .click()
  await expect(dialog.getByRole("alert")).toContainText(
    "not delivered or cancelled yet"
  )

  // cancelling the order frees the account
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

  await open(page, "/account/security")
  await page
    .getByRole("button", { name: "Delete account" })
    .click()
  await page
    .getByRole("alertdialog")
    .getByLabel("Enter your password to confirm")
    .fill(account.password)
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete my account" })
    .click()
  await expect(page).toHaveURL("/")
})
