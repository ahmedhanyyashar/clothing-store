import {
  createSignedInUser,
  open,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from "./support/flows"
import { countEmails } from "./support/mailpit"
import { expect, test } from "./support/test"

test("a visitor signs up, confirms their email and lands signed in", async ({
  page,
  account,
}) => {
  await signUp(page, account)
  await verifyEmail(page, account)

  await open(page, "/account")
  await expect(
    page.getByRole("heading", { name: "Account" })
  ).toBeVisible()
  await expect(page.getByText(account.email)).toBeVisible()
})

test("signing in is refused until the email is confirmed, and a new link can be requested", async ({
  page,
  account,
}) => {
  await signUp(page, account)

  await open(page, "/sign-in")
  await signIn(page, account)
  await expect(
    page.getByText(
      "Confirm your email address before signing in"
    )
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Send the link again" })
    .click()
  await expect
    .poll(() => countEmails(account.email))
    .toBe(2)

  await verifyEmail(page, account)
})

test("a wrong password is rejected without saying which part was wrong", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await signOut(page)

  await open(page, "/sign-in")
  await signIn(page, account, "not-the-right-password")

  await expect(
    page.getByText("Invalid email or password")
  ).toBeVisible()
})

test("a signed-out visitor is sent to sign in and then back to the page they wanted", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await signOut(page)

  await open(page, "/account")
  await expect(page).toHaveURL(
    "/sign-in?redirect=%2Faccount"
  )

  await signIn(page, account)
  await expect(page).toHaveURL("/account")
  await expect(page.getByText(account.email)).toBeVisible()
})

test("signing out ends the session", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)

  await signOut(page)

  await open(page, "/account")
  await expect(page).toHaveURL(/\/sign-in/)
})

test("a signed-in visitor is sent away from the sign-in page", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)

  await open(page, "/sign-in")

  await expect(page).toHaveURL("/")
})
