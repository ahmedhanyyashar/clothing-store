import { open } from "./support/flows"
import { expect, test } from "./support/test"

// These tests browse the sample catalog loaded by the global setup: 14
// products, 12 to a page, with one product that is sold out.

test("the home page features best sellers and the latest arrivals", async ({
  page,
}) => {
  await open(page, "/")

  await expect(
    page.getByRole("heading", { name: "Best sellers" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Latest arrivals" })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Running Sneakers" })
  ).toBeVisible()
})

test("a shopper finds a product and reads its details", async ({
  page,
}) => {
  await open(page, "/")

  await page
    .getByRole("link", { name: "Classic White Tee" })
    .first()
    .click()

  await expect(page).toHaveURL(/\/products\//)
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Classic White Tee",
    })
  ).toBeVisible()
  await expect(page.getByText("$24.99")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Sizes" })
  ).toBeVisible()
  await expect(page.getByText("In stock")).toBeVisible()
})

test("the shop pages through the catalog 12 products at a time", async ({
  page,
}) => {
  await open(page, "/shop")
  await expect(
    page.getByText("Showing 1–12 of 14 products")
  ).toBeVisible()

  await page.getByRole("link", { name: "Page 2" }).click()

  await expect(page).toHaveURL(/page=2/)
  await expect(
    page.getByText("Showing 13–14 of 14 products")
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Page 2" })
  ).toHaveAttribute("aria-current", "page")
})

test("ticking filters narrows the shop and puts them in the URL", async ({
  page,
}) => {
  await open(page, "/shop")

  await page
    .getByRole("checkbox", { name: "Women", exact: true })
    .check()
  await expect(page).toHaveURL(/category=women/)
  await expect(
    page.getByText("Showing 1–6 of 6 products")
  ).toBeVisible()

  await page
    .getByRole("checkbox", { name: "Jeans", exact: true })
    .check()
  await expect(
    page.getByText("Showing 1–1 of 1 product")
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Light Wash Jeans" })
  ).toBeVisible()

  await page
    .getByRole("link", { name: "Clear all filters" })
    .click()
  await expect(
    page.getByText("Showing 1–12 of 14 products")
  ).toBeVisible()
})

test("a filtered view can be shared as a link", async ({
  page,
}) => {
  await open(page, "/shop?category=men,women&type=shoes")

  await expect(
    page.getByRole("checkbox", { name: "Men", exact: true })
  ).toBeChecked()
  await expect(
    page.getByRole("checkbox", {
      name: "Women",
      exact: true,
    })
  ).toBeChecked()
  await expect(
    page.getByRole("checkbox", {
      name: "Shoes",
      exact: true,
    })
  ).toBeChecked()
  await expect(
    page.getByText("Showing 1–2 of 2 products")
  ).toBeVisible()
})

test("searching by name finds matching products", async ({
  page,
}) => {
  await open(page, "/shop")

  await page
    .getByRole("searchbox", { name: "Search products" })
    .fill("hoodie")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page).toHaveURL(/q=hoodie/)
  await expect(
    page.getByText("Showing 1–1 of 1 product")
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Pullover Hoodie" })
  ).toBeVisible()
})

test("a search with no matches says so and offers a way back", async ({
  page,
}) => {
  await open(page, "/shop?q=zzzz")

  await expect(
    page.getByText("No products match these filters.")
  ).toBeVisible()
  await page
    .getByRole("link", { name: "Clear all filters" })
    .first()
    .click()
  await expect(
    page.getByText("Showing 1–12 of 14 products")
  ).toBeVisible()
})

test("sorting by price puts the cheapest product first", async ({
  page,
}) => {
  await open(page, "/shop")

  await page
    .getByRole("combobox", { name: "Sort by" })
    .selectOption("price-asc")

  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(
    page.getByRole("article").first().getByRole("link")
  ).toHaveText("Kids Graphic Tee")
})

test("a sold-out product is marked in the shop and on its page", async ({
  page,
}) => {
  await open(page, "/shop?q=tie-dye")
  await expect(page.getByText("Sold out")).toBeVisible()

  await page
    .getByRole("link", { name: "Tie-Dye Button Shirt" })
    .click()

  await expect(
    page.getByText("Sold out").first()
  ).toBeVisible()
  await expect(page.getByText("In stock")).toHaveCount(0)
})

test("a product that does not exist, or a page past the end, is a 404", async ({
  page,
}) => {
  const missing = await page.goto(
    "/products/no-such-product"
  )
  expect(missing?.status()).toBe(404)
  await expect(
    page.getByText("Page not found")
  ).toBeVisible()

  await open(page, "/shop?page=99")
  await expect(
    page.getByText("Page not found")
  ).toBeVisible()
})
