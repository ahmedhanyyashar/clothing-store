import {
  createSignedInUser,
  open,
  signIn,
  signOut,
} from "./support/flows"
import { waitForLink } from "./support/mailpit"
import { expect, test } from "./support/test"

const NEW_PASSWORD = "a-brand-new-password-1"

test("the account pages are for signed-in visitors only", async ({
  page,
}) => {
  await open(page, "/account/security")

  await expect(page).toHaveURL(
    "/sign-in?redirect=%2Faccount%2Fsecurity"
  )
})

test("a user changes their name and sees it everywhere", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await open(page, "/account")

  await page.getByLabel("Name").fill("Ada King")
  await page
    .getByRole("button", { name: "Save changes" })
    .click()

  await expect(page.getByText("Saved.")).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Ada King" })
  ).toBeVisible()
})

test("a user changes their password, is told by email, and signs in with the new one", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await open(page, "/account/security")

  await page
    .getByLabel("Current password")
    .fill(account.password)
  await page
    .getByLabel("New password", { exact: true })
    .fill(NEW_PASSWORD)
  await page
    .getByLabel("Confirm new password")
    .fill(NEW_PASSWORD)
  await page
    .getByRole("button", { name: "Change password" })
    .click()

  await expect(
    page.getByText("Password updated.")
  ).toBeVisible()
  await waitForLink(account.email, /password was changed/)

  await signOut(page)
  await open(page, "/sign-in")
  await signIn(page, account, account.password)
  await expect(
    page.getByText("Invalid email or password")
  ).toBeVisible()

  await signIn(page, account, NEW_PASSWORD)
  await expect(page).toHaveURL("/")
})

test("a wrong current password changes nothing", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await open(page, "/account/security")

  await page
    .getByLabel("Current password")
    .fill("not-the-right-password")
  await page
    .getByLabel("New password", { exact: true })
    .fill(NEW_PASSWORD)
  await page
    .getByLabel("Confirm new password")
    .fill(NEW_PASSWORD)
  await page
    .getByRole("button", { name: "Change password" })
    .click()

  await expect(
    page.getByText(/invalid password/i)
  ).toBeVisible()
  await expect(
    page.getByText("Password updated.")
  ).toHaveCount(0)
})

test("a user deletes their account and can no longer sign in", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await open(page, "/account/security")

  await page
    .getByRole("button", { name: "Delete account" })
    .click()
  const dialog = page.getByRole("alertdialog")
  await dialog
    .getByLabel("Enter your password to confirm")
    .fill(account.password)
  await dialog
    .getByRole("button", { name: "Delete my account" })
    .click()

  await expect(page).toHaveURL("/")
  await expect(
    page.getByRole("link", { name: "Sign in" })
  ).toBeVisible()

  await open(page, "/sign-in")
  await signIn(page, account)
  await expect(
    page.getByText("Invalid email or password")
  ).toBeVisible()
})
