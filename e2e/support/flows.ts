import type { Page } from "@playwright/test"

import { waitForLink } from "./mailpit"
import { expect, type Account } from "./test"

/**
 * Navigates and waits for the page to finish loading its scripts. Forms are
 * rendered on the server and only become interactive once React hydrates, and
 * anything typed before that is discarded.
 */
export async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle" })
}

export async function signUp(page: Page, account: Account) {
  await open(page, "/sign-up")
  await page.getByLabel("Name").fill(account.name)
  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Password").fill(account.password)
  await page
    .getByRole("button", { name: "Create account" })
    .click()
  await expect(page.getByRole("status")).toContainText(
    `We sent a verification link to ${account.email}`
  )
}

/** Follows the verification link from the email; the user ends up signed in. */
export async function verifyEmail(
  page: Page,
  account: Account
) {
  const link = await waitForLink(
    account.email,
    /Verify your email/
  )
  await open(page, link)
  await expect(page).toHaveURL("/")
  await expect(
    page.getByRole("link", { name: account.name })
  ).toBeVisible()
}

export async function signIn(
  page: Page,
  account: Account,
  password = account.password
) {
  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Password").fill(password)
  await page
    .getByRole("button", { name: "Sign in" })
    .click()
}

export async function signOut(page: Page) {
  await page
    .getByRole("button", { name: "Sign out" })
    .click()
  await expect(
    page.getByRole("link", { name: "Sign in" })
  ).toBeVisible()
}

/** A verified user who is currently signed in. */
export async function createSignedInUser(
  page: Page,
  account: Account
) {
  await signUp(page, account)
  await verifyEmail(page, account)
}
