import { open } from "./support/flows"
import { expect, test } from "./support/test"

test("a visitor tries the shop as the demo shopper, who cannot be changed", async ({
  page,
}) => {
  await open(page, "/sign-in")
  await page
    .getByRole("button", { name: "Use the demo shopper" })
    .click()

  // signed in, without typing anything
  await expect(
    page.getByRole("link", {
      name: "Account of Demo Shopper",
    })
  ).toBeVisible()

  // the settings are replaced by an explanation
  await open(page, "/account/settings")
  await expect(page.getByText("Demo account")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Change password" })
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Delete account" })
  ).toHaveCount(0)

  // a change that is tried anyway is refused by the server
  await open(page, "/account")
  await page.getByLabel("Name").fill("Someone Else")
  await page
    .getByRole("button", { name: "Save changes" })
    .click()
  await expect(
    page.getByRole("main").getByRole("alert")
  ).toContainText("demo account")
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
