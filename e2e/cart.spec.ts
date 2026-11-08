import {
  createSignedInUser,
  open,
  signOut,
  signUp,
  verifyEmail,
} from "./support/flows"
import { addToCart, openTee } from "./support/shop"
import { expect, test } from "./support/test"

test("a visitor fills a cart, changes it, and it survives a reload", async ({
  page,
}) => {
  await openTee(page)

  await page
    .getByRole("button", { name: "Add to cart" })
    .click()
  await expect(
    page.getByText("Choose a size.")
  ).toBeVisible()

  await addToCart(page, "M", "2")
  await expect(
    page.getByRole("button", { name: "Cart, 2 items" })
  ).toBeVisible()

  // the drawer
  await page
    .getByRole("button", { name: "Cart, 2 items" })
    .click()
  const drawer = page.getByRole("dialog", {
    name: "Your cart",
  })
  await expect(
    drawer.getByText("Classic White Tee")
  ).toBeVisible()
  await expect(
    drawer.getByText("$49.98").first()
  ).toBeVisible()
  await drawer
    .getByRole("link", { name: "View cart" })
    .click()

  // the page
  await expect(page).toHaveURL("/cart")
  await page
    .getByRole("combobox", {
      name: "Quantity for Classic White Tee, size M",
    })
    .selectOption("3")
  await expect(
    page.getByRole("button", { name: "Cart, 3 items" })
  ).toBeVisible()
  await expect(
    page.getByText("$74.97").first()
  ).toBeVisible()

  await page.reload({ waitUntil: "networkidle" })
  await expect(
    page.getByRole("button", { name: "Cart, 3 items" })
  ).toBeVisible()
  await expect(
    page.getByText("$74.97").first()
  ).toBeVisible()

  await page
    .getByRole("button", {
      name: "Remove Classic White Tee, size M",
    })
    .click()
  await expect(
    page.getByText("Your cart is empty.")
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Cart", exact: true })
  ).toBeVisible()
})

test("the quantity offered never exceeds the stock of the size", async ({
  page,
}) => {
  await openTee(page)

  await page.getByText("XL", { exact: true }).click()

  await expect(
    page
      .getByRole("combobox", { name: "Quantity" })
      .locator("option")
  ).toHaveText(["1", "2", "3", "4", "5", "6"])
})

test("a visitor keeps the cart after signing up", async ({
  page,
  account,
}) => {
  await openTee(page)
  await addToCart(page, "L")

  await signUp(page, account)
  await verifyEmail(page, account)

  await expect(
    page.getByRole("button", { name: "Cart, 1 item" })
  ).toBeVisible()
})

test("signing out empties the cart, so the next person on this browser starts fresh", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await openTee(page)
  await addToCart(page, "S")
  await expect(
    page.getByRole("button", { name: "Cart, 1 item" })
  ).toBeVisible()

  await signOut(page)

  await expect(
    page.getByRole("button", { name: "Cart", exact: true })
  ).toBeVisible()
  await open(page, "/cart")
  await expect(
    page.getByText("Your cart is empty.")
  ).toBeVisible()
})
