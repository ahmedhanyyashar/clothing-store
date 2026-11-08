import { randomUUID } from "node:crypto"

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

/** A name no other test uses, so the shop search finds exactly this product. */
const uniqueName = () =>
  `E2E Tee ${randomUUID().slice(0, 8)}`

async function addProduct(
  page: Page,
  name: string,
  price = "19.99"
) {
  await open(page, "/admin/products/new")
  await page.getByLabel("Name", { exact: true }).fill(name)
  await page
    .getByLabel("Description")
    .fill("Made by an end-to-end test.")
  await page.getByLabel("Price (USD)").fill(price)
  await page
    .getByLabel("Category")
    .selectOption({ label: "Women" })
  await page
    .getByLabel("Type")
    .selectOption({ label: "Shirts" })
  await page.getByLabel("Size 1", { exact: true }).fill("M")
  await page.getByLabel("Stock of size 1").fill("4")
  await page
    .getByRole("button", { name: "Add a size" })
    .click()
  await page.getByLabel("Size 2", { exact: true }).fill("L")
  await page.getByLabel("Stock of size 2").fill("2")
  await page
    .getByRole("button", { name: "Add a color" })
    .click()
  await page.getByLabel("Color name 1").fill("Navy")
  await page
    .getByRole("button", { name: "Add product" })
    .click()
  await expect(page).toHaveURL("/admin/products")
}

test("an admin adds a product and shoppers can find and open it", async ({
  page,
  account,
}) => {
  await becomeAdmin(page, account)
  const name = uniqueName()

  await addProduct(page, name)

  // in the admin list, with its price and total stock
  const row = page.getByRole("row", {
    name: new RegExp(name),
  })
  await expect(row).toBeVisible()
  await expect(row).toContainText("$19.99")
  await expect(row).toContainText("Women · Shirts")
  await expect(row).toContainText("6")

  // in the shop
  await open(page, `/shop?q=${encodeURIComponent(name)}`)
  await expect(
    page.getByText("Showing 1–1 of 1 product")
  ).toBeVisible()
  await expect(page.getByText("$19.99")).toBeVisible()
  await page.getByRole("link", { name }).click()
  await expect(
    page.getByRole("heading", { level: 1, name })
  ).toBeVisible()
  await expect(page.getByText("In stock")).toBeVisible()
  await expect(
    page.getByRole("radio", { name: "M" })
  ).toBeEnabled()
  await expect(
    page.getByRole("radio", { name: "L" })
  ).toBeEnabled()
  // no photo yet: a labelled placeholder, not a broken image
  await expect(
    page.getByRole("img", { name: "No image available" })
  ).toBeVisible()
})

test("an admin edits a product, the changes are in the shop and the log, and then deletes it", async ({
  page,
  account,
}) => {
  await becomeAdmin(page, account)
  const name = uniqueName()
  await addProduct(page, name)

  await page.getByRole("link", { name }).click()
  // wait for the edit page itself: opening it is a soft navigation
  await expect(page).toHaveURL(
    /\/admin\/products\/c[a-z0-9]{20,}$/
  )
  await page.waitForLoadState("networkidle")
  const editUrl = page.url()
  const id = editUrl.split("/").pop()!
  await page.getByLabel("Price (USD)").fill("21.50")
  await page.getByLabel("Stock of size M").fill("9")
  await page
    .getByRole("button", { name: "Save changes" })
    .click()
  await expect(page).toHaveURL("/admin/products")
  await expect(
    page.getByRole("row", { name: new RegExp(name) })
  ).toContainText("$21.50")

  // the log says exactly what changed
  await open(page, "/admin/audit")
  const entry = page
    .getByRole("row")
    .filter({ hasText: `"${name}": price $19.99 → $21.50` })
  await expect(entry).toBeVisible()
  await expect(entry).toContainText("stock of M 4 → 9")

  // the shop shows the new price
  await open(page, `/shop?q=${encodeURIComponent(name)}`)
  await expect(page.getByText("$21.50")).toBeVisible()

  // deleting asks first, then the product is gone from the shop
  await open(page, editUrl)
  await page
    .getByRole("button", { name: "Delete product" })
    .click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete product" })
    .click()
  await expect(page).toHaveURL("/admin/products")
  await expect(
    page.getByRole("link", { name })
  ).toHaveCount(0)
  expect(
    (await page.goto(`/products/${id}`))?.status()
  ).toBe(404)
})

/** A real 1 by 1 PNG, so the shop can resize it like any photo. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
)

test("an admin adds a photo, shoppers see it, and deleting the product deletes the file", async ({
  page,
  account,
}) => {
  await becomeAdmin(page, account)
  const name = uniqueName()
  await open(page, "/admin/products/new")
  await page.getByLabel("Name", { exact: true }).fill(name)
  await page.getByLabel("Description").fill("Has a photo.")
  await page.getByLabel("Price (USD)").fill("12.00")
  await page.getByLabel("Size 1", { exact: true }).fill("M")
  await page.getByLabel("Stock of size 1").fill("3")

  // the file goes straight to the bucket, before the product is saved
  await page.getByLabel("Add photos").setInputFiles({
    name: "front.png",
    mimeType: "image/png",
    buffer: PNG,
  })
  await expect(
    page.getByRole("button", { name: "Remove photo 1" })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Add product" })
    .click()
  await expect(page).toHaveURL("/admin/products")

  // shoppers see the photo, not the placeholder
  await open(page, `/shop?q=${encodeURIComponent(name)}`)
  await page.getByRole("link", { name }).click()
  await expect(
    page.getByRole("heading", { level: 1, name })
  ).toBeVisible()
  await expect(
    page.getByRole("img", { name: "No image available" })
  ).toHaveCount(0)
  const productUrl = page.url()

  // the file's address, from the edit page, then delete the product
  await open(page, "/admin/products")
  await page.getByRole("link", { name }).click()
  await expect(page).toHaveURL(
    /\/admin\/products\/c[a-z0-9]{20,}$/
  )
  await page.waitForLoadState("networkidle")
  const src = await page
    .locator("fieldset img")
    .first()
    .getAttribute("src")
  const fileUrl = new URL(
    src!,
    page.url()
  ).searchParams.get("url")!
  expect((await page.request.get(fileUrl)).status()).toBe(
    200
  )

  await page
    .getByRole("button", { name: "Delete product" })
    .click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete product" })
    .click()
  await expect(page).toHaveURL("/admin/products")
  expect((await page.request.get(fileUrl)).status()).toBe(
    404
  )
  expect((await page.goto(productUrl))?.status()).toBe(404)
})

test("the form says what is wrong and saves nothing", async ({
  page,
  account,
}) => {
  await becomeAdmin(page, account)
  await open(page, "/admin/products/new")

  await page
    .getByRole("button", { name: "Add product" })
    .click()

  await expect(
    page.getByText("Name must be at least 2 characters")
  ).toBeVisible()
  await expect(
    page.getByText("Enter a price such as 24.99")
  ).toBeVisible()
  await expect(page.getByText("Enter a size")).toBeVisible()
  await expect(page).toHaveURL("/admin/products/new")
})

test("the product pages are for admins only", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)

  for (const path of [
    "/admin/products",
    "/admin/products/new",
    "/admin/products/no-such-product",
  ]) {
    expect((await page.goto(path))?.status()).toBe(404)
  }
})
