import { createSignedInUser, open } from "./support/flows"
import {
  addToCart,
  fillAddress,
  homeAddress,
  openTee,
  placeOrderFromCheckout,
  saveHomeAddress,
} from "./support/shop"
import { expect, test } from "./support/test"

// Every test buys small amounts of sizes S and M of the Classic White Tee,
// which have plenty of stock. XL is left alone: the cart tests count it.

test("a shopper checks out with cash on delivery", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await saveHomeAddress(page)
  await openTee(page)
  await addToCart(page, "M", "2")

  // from the cart to the checkout
  await open(page, "/cart")
  await page.getByRole("link", { name: "Checkout" }).click()
  await expect(page).toHaveURL("/checkout")
  await expect(
    page.getByText("Cash on delivery").first()
  ).toBeVisible()
  await expect(
    page.getByRole("radio", { name: /Home/ })
  ).toBeChecked()
  // $49.98 is below the free-shipping line
  await expect(page.getByText("$54.98")).toBeVisible()

  const number = await placeOrderFromCheckout(page)

  await expect(
    page.getByText("Thank you, your order is placed.")
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: `Order ${number}` })
  ).toBeVisible()
  await expect(
    page.getByText("Size M · Qty 2")
  ).toBeVisible()
  await expect(page.getByText("1 Main St")).toBeVisible()
  await expect(
    page.getByText("Pending").first()
  ).toBeVisible()

  // the cart was emptied by the order
  await expect(
    page.getByRole("button", { name: "Cart", exact: true })
  ).toBeVisible()
})

test("checkout asks a visitor to sign in first, and the cart waits", async ({
  page,
}) => {
  await openTee(page)
  await addToCart(page, "S")

  await open(page, "/checkout")

  await expect(page).toHaveURL(
    "/sign-in?redirect=%2Fcheckout"
  )
  await expect(
    page.getByRole("button", { name: "Cart, 1 item" })
  ).toBeVisible()
})

test("a shopper with no address adds one and comes straight back to the checkout", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await openTee(page)
  await addToCart(page, "S")
  await open(page, "/checkout")

  await expect(
    page.getByText("You have no saved address yet.")
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Place order" })
  ).toBeDisabled()

  await page
    .getByRole("link", { name: "Add an address" })
    .click()
  await page.waitForLoadState("networkidle")
  await fillAddress(page, homeAddress)
  await page
    .getByRole("button", { name: "Save address" })
    .click()

  await expect(page).toHaveURL("/checkout")
  await expect(
    page.getByRole("radio", { name: /Home/ })
  ).toBeChecked()
  await expect(
    page.getByRole("button", { name: "Place order" })
  ).toBeEnabled()
})
