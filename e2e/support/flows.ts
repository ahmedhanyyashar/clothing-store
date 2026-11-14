import { randomUUID } from "node:crypto"

import { test, type Page } from "@playwright/test"
import { hashPassword } from "better-auth/crypto"

import { grantAdmin } from "@/lib/admin/roles"
import { prisma } from "@/lib/db/client"

import { waitForLink } from "./mailpit"
import { expect, type Account } from "./test"

/**
 * Waits until React has taken over the page (see HydrationMarker). Forms are
 * rendered on the server and only become interactive then, and anything typed
 * before that is discarded. Pages reached by clicking a link inside the app need
 * no such wait: their elements are mounted by React already.
 */
export async function hydrated(page: Page) {
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.hydrated === "true"
  )
}

/** Navigates to a page and waits until it is interactive. */
export async function open(page: Page, url: string) {
  await page.goto(url)
  await hydrated(page)
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
    page.getByRole("button", {
      name: `Account of ${account.name}`,
    })
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
    .getByRole("button", { name: /^Account of / })
    .click()
  await page
    .getByRole("menuitem", { name: "Sign out" })
    .click()
  await expect(
    page.getByRole("link", { name: "Sign in" })
  ).toBeVisible()
}

/**
 * A verified user who is currently signed in, made without the sign-up form:
 * the user is written to the database and signed in over the sign-in endpoint,
 * which leaves the session cookie in the page's context. The form itself is
 * covered by the specs that are about signing up. `admin` also makes them an
 * admin, the way the operator command does.
 */
export async function createSignedInUser(
  page: Page,
  account: Account,
  { admin = false }: { admin?: boolean } = {}
) {
  const id = randomUUID()
  await prisma.user.create({
    data: {
      id,
      name: account.name,
      email: account.email,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(account.password),
        },
      },
    },
  })
  if (admin) await grantAdmin(account.email)

  const response = await page.request.post(
    "/api/auth/sign-in/email",
    {
      data: {
        email: account.email,
        password: account.password,
      },
      // the auth endpoints refuse a request that does not say where it is from
      headers: { origin: test.info().project.use.baseURL! },
    }
  )
  expect(
    response.ok(),
    `${response.status()} ${await response.text()}`
  ).toBe(true)
  await open(page, "/")
}
