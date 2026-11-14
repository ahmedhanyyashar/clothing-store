import { open } from "./support/flows"
import { expect, test } from "./support/test"

test("a visitor tries the shop as the demo shopper", async ({
  page,
}) => {
  await open(page, "/sign-in")
  await page
    .getByRole("button", { name: "Use the demo shopper" })
    .click()

  // signed in, without typing anything
  await expect(
    page.getByRole("button", {
      name: "Account of Demo Shopper",
    })
  ).toBeVisible()
})

test("the demo buttons ask for a real choice and never show a password", async ({
  page,
}) => {
  await open(page, "/sign-in")

  await expect(
    page.getByRole("button", { name: "Use the demo admin" })
  ).toBeVisible()
  expect(await page.content()).not.toContain(
    "demo-test-password"
  )
})
