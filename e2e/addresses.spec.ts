import { randomUUID } from "node:crypto"

import type { Page } from "@playwright/test"

import {
  createSignedInUser,
  open,
  signOut,
} from "./support/flows"
import { expect, test } from "./support/test"

async function fillAddress(
  page: Page,
  details: {
    label: string
    street: string
    city: string
    region: string
    postalCode: string
    phone: string
    country?: string
  }
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

const home = {
  label: "Home",
  street: "1 Main St",
  city: "Austin",
  region: "Texas",
  postalCode: "73301",
  phone: "202 555 0123",
}

const office = {
  label: "Office",
  street: "10 Downing St",
  city: "London",
  region: "Greater London",
  postalCode: "sw1a 2aa",
  phone: "020 7946 0958",
  country: "GB",
}

async function save(page: Page) {
  await page
    .getByRole("button", { name: "Save address" })
    .click()
  await expect(page).toHaveURL("/account/addresses")
}

test("a user saves addresses, picks a default and deletes one", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await open(page, "/account/addresses")
  await expect(
    page.getByText("You have no saved addresses yet.")
  ).toBeVisible()

  // the first address is the default without being asked
  await page
    .getByRole("link", { name: "Add address" })
    .click()
  await page.waitForLoadState("networkidle")
  await expect(
    page.getByRole("checkbox", { name: "Default address" })
  ).toBeChecked()
  await fillAddress(page, home)
  await save(page)
  const homeCard = page
    .getByRole("listitem")
    .filter({ hasText: "Home" })
  await expect(
    homeCard.getByText("Default", { exact: true })
  ).toBeVisible()
  await expect(
    homeCard.getByText("+12025550123")
  ).toBeVisible()
  await expect(homeCard.getByText("Texas")).toBeVisible()

  // a second one in another country, made the default
  await page
    .getByRole("link", { name: "Add address" })
    .click()
  await page.waitForLoadState("networkidle")
  await fillAddress(page, office)
  await page
    .getByLabel("Make this my default address")
    .check()
  await save(page)
  const officeCard = page
    .getByRole("listitem")
    .filter({ hasText: "Office" })
  await expect(
    officeCard.getByText("Default", { exact: true })
  ).toBeVisible()
  await expect(
    homeCard.getByText("Default", { exact: true })
  ).toHaveCount(0)
  await expect(
    officeCard.getByText("SW1A 2AA London")
  ).toBeVisible()
  await expect(
    officeCard.getByText("United Kingdom")
  ).toBeVisible()

  // deleting the default hands the role to the one that is left
  await officeCard
    .getByRole("button", { name: "Delete Office" })
    .click()
  await page
    .getByRole("button", { name: "Delete address" })
    .click()
  await expect(officeCard).toHaveCount(0)
  await expect(
    homeCard.getByText("Default", { exact: true })
  ).toBeVisible()
})

test("a user edits an address", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await open(page, "/account/addresses/new")
  await fillAddress(page, home)
  await save(page)

  await page
    .getByRole("link", { name: "Edit Home" })
    .click()
  await page.waitForLoadState("networkidle")
  await page.getByLabel("City").fill("Dallas")
  await save(page)

  await expect(page.getByText("73301 Dallas")).toBeVisible()
})

test("a postal code that does not fit the country is refused with an example", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await open(page, "/account/addresses/new")

  await fillAddress(page, { ...home, postalCode: "ABCDE" })
  await page
    .getByRole("button", { name: "Save address" })
    .click()

  await expect(
    page.getByText(
      "Enter a valid postal code, for example 90210"
    )
  ).toBeVisible()
  await expect(page).toHaveURL("/account/addresses/new")
})

test("one user cannot open another user's address", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await open(page, "/account/addresses/new")
  await fillAddress(page, home)
  await save(page)
  const editHref = await page
    .getByRole("link", { name: "Edit Home" })
    .getAttribute("href")
  await signOut(page)

  await createSignedInUser(page, {
    ...account,
    email: `e2e-${randomUUID().slice(0, 8)}@example.com`,
  })
  const response = await page.goto(editHref!)

  expect(response?.status()).toBe(404)
  await expect(
    page.getByText("Page not found")
  ).toBeVisible()
  await expect(page.getByText("1 Main St")).toHaveCount(0)
})

test("the address pages are for signed-in visitors only", async ({
  page,
}) => {
  await open(page, "/account/addresses")

  await expect(page).toHaveURL(
    "/sign-in?redirect=%2Faccount%2Faddresses"
  )
})
