import {
  createSignedInUser,
  open,
  signIn,
  signOut,
} from "./support/flows"
import { waitForLink } from "./support/mailpit"
import { expect, test } from "./support/test"

test("a forgotten password is replaced through the emailed link", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await signOut(page)

  await open(page, "/sign-in")
  await expect(
    page.getByRole("link", {
      name: "Forgot your password?",
    })
  ).toHaveAttribute("href", "/forgot-password")
  await open(page, "/forgot-password")
  await page.getByLabel("Email").fill(account.email)
  await page
    .getByRole("button", { name: "Send reset link" })
    .click()
  await expect(page.getByRole("status")).toContainText(
    `If an account exists for ${account.email}`
  )

  await open(
    page,
    await waitForLink(account.email, /Reset your/)
  )
  const newPassword = "a-brand-new-password"
  await page
    .getByLabel("New password", { exact: true })
    .fill(newPassword)
  await page
    .getByLabel("Confirm new password")
    .fill(newPassword)
  await page
    .getByRole("button", { name: "Set new password" })
    .click()
  await expect(page.getByRole("status")).toContainText(
    "Password updated"
  )

  await open(page, "/sign-in")
  await signIn(page, account, account.password)
  await expect(
    page.getByText("Invalid email or password")
  ).toBeVisible()

  await signIn(page, account, newPassword)
  await expect(page).toHaveURL("/")
})

test("a reset request gets the same answer for an address with no account", async ({
  page,
  account,
}) => {
  await open(page, "/forgot-password")
  await page.getByLabel("Email").fill(account.email)
  await page
    .getByRole("button", { name: "Send reset link" })
    .click()

  await expect(page.getByRole("status")).toContainText(
    `If an account exists for ${account.email}`
  )
})

test("an invalid reset link explains itself and offers a new one", async ({
  page,
}) => {
  await open(page, "/reset-password?error=INVALID_TOKEN")

  await expect(
    page.getByText(
      "This reset link is invalid or has expired."
    )
  ).toBeVisible()
  await page
    .getByRole("link", { name: "Request a new link" })
    .click()
  await expect(page).toHaveURL("/forgot-password")
})
