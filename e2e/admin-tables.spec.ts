import type { Page } from "@playwright/test"

import { adminCommand } from "./support/admin"
import { createSignedInUser, open } from "./support/flows"
import { expect, test, type Account } from "./support/test"

async function becomeAdmin(page: Page, account: Account) {
  await createSignedInUser(page, account)
  expect(adminCommand("grant", account.email).status).toBe(
    0
  )
}

/** The prices in the table, top to bottom, in dollars. */
async function prices(page: Page) {
  const cells = await page
    .locator("tbody tr td:nth-child(4)")
    .allTextContents()
  return cells.map((text) => Number(text.replace("$", "")))
}

test("an admin sorts the product list by clicking a heading", async ({
  page,
  account,
}) => {
  await becomeAdmin(page, account)
  await open(page, "/admin/products")
  await page.waitForLoadState("networkidle")

  await page.getByRole("link", { name: /^Price/ }).click()
  await expect(page).toHaveURL(/sort=price&dir=asc/)
  await expect(
    page.getByRole("columnheader", { name: /Price/ })
  ).toHaveAttribute("aria-sort", "ascending")
  const ascending = await prices(page)
  expect(ascending.length).toBeGreaterThan(1)
  expect(ascending).toEqual(
    [...ascending].sort((a, b) => a - b)
  )

  // the same heading again turns it round
  await page.getByRole("link", { name: /^Price/ }).click()
  await expect(page).toHaveURL(/sort=price&dir=desc/)
  await expect(
    page.getByRole("columnheader", { name: /Price/ })
  ).toHaveAttribute("aria-sort", "descending")
  const descending = await prices(page)
  expect(descending).toEqual(
    [...descending].sort((a, b) => b - a)
  )
})

test("a search keeps the sort", async ({
  page,
  account,
}) => {
  await becomeAdmin(page, account)
  await open(page, "/admin/products?sort=name&dir=desc")

  await page.getByLabel("Search by name").fill("Tee")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page).toHaveURL(/q=Tee/)
  await expect(page).toHaveURL(/sort=name&dir=desc/)
  await expect(
    page.getByRole("columnheader", { name: /Name/ })
  ).toHaveAttribute("aria-sort", "descending")
})

test("a sort the list does not offer is ignored", async ({
  page,
  account,
}) => {
  await becomeAdmin(page, account)

  for (const path of [
    "/admin/products?sort=password&dir=asc",
    "/admin/orders?sort=%27%3B+drop+table+order&dir=sideways",
  ]) {
    expect((await page.goto(path))?.status()).toBe(200)
  }
})
