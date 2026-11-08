import type { Page } from "@playwright/test"

import { createSignedInUser, open } from "./flows"
import { expect, type Account } from "./test"

// Classic White Tee costs $24.99 and has 6 in size XL.

export async function openTee(page: Page) {
  await open(page, "/shop?q=classic+white")
  await page
    .getByRole("link", { name: "Classic White Tee" })
    .click()
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Classic White Tee",
    })
  ).toBeVisible()
  // the product page is server-rendered; wait for its scripts before using the form
  await page.waitForLoadState("networkidle")
}

/** On a product page: choose a size and quantity and add it to the cart. */
export async function addToCart(
  page: Page,
  size: string,
  quantity = "1"
) {
  // the radio itself is visually hidden; its label is what a shopper clicks
  await page.getByText(size, { exact: true }).click()
  await page
    .getByRole("combobox", { name: "Quantity" })
    .selectOption(quantity)
  await page
    .getByRole("button", { name: "Add to cart" })
    .click()
  await expect(
    page.getByText("Added to your cart.")
  ).toBeVisible()
}

export type AddressDetails = {
  label: string
  street: string
  city: string
  region: string
  postalCode: string
  phone: string
  country?: string
}

export const homeAddress: AddressDetails = {
  label: "Home",
  street: "1 Main St",
  city: "Austin",
  region: "Texas",
  postalCode: "73301",
  phone: "202 555 0123",
}

/** On the address form: fill every field. The caller saves. */
export async function fillAddress(
  page: Page,
  details: AddressDetails
) {
  if (details.country) {
    await page
      .getByLabel("Country")
      .selectOption(details.country)
  }
  await page
    .getByLabel("Label (optional)")
    .fill(details.label)
  await page.getByLabel("Full name").fill("Ada Lovelace")
  await page.getByLabel("Phone").fill(details.phone)
  await page
    .getByLabel("Street address")
    .fill(details.street)
  await page.getByLabel("City").fill(details.city)
  const region = page.getByLabel(/^(State|County)/)
  if (
    (await region.evaluate((el) => el.tagName)) === "SELECT"
  )
    await region.selectOption(details.region)
  else await region.fill(details.region)
  await page
    .getByLabel("Postal code")
    .fill(details.postalCode)
}

/** Saves an address from the account area, so a user has one to check out with. */
export async function saveHomeAddress(page: Page) {
  await open(page, "/account/addresses/new")
  await fillAddress(page, homeAddress)
  await page
    .getByRole("button", { name: "Save address" })
    .click()
  await expect(page).toHaveURL("/account/addresses")
}

/** A signed-in user with an address and tees in the cart, on the checkout page. */
export async function readyToCheckOut(
  page: Page,
  account: Account,
  quantity = "1"
) {
  await createSignedInUser(page, account)
  await saveHomeAddress(page)
  await openTee(page)
  await addToCart(page, "S", quantity)
  await open(page, "/checkout")
  await expect(
    page.getByRole("heading", { name: "Order summary" })
  ).toBeVisible()
}

/** On the checkout page: place the order and return its number. */
export async function placeOrderFromCheckout(page: Page) {
  await page
    .getByRole("button", { name: "Place order" })
    .click()
  await expect(page).toHaveURL(
    /\/account\/orders\/CS-[A-Z0-9]{8}/
  )
  return new URL(page.url()).pathname.split("/").pop()!
}
