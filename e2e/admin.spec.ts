import { adminCommand } from "./support/admin"
import { createSignedInUser, open } from "./support/flows"
import { expect, test } from "./support/test"

test("the admin area is for admins only", async ({
  page,
  account,
}) => {
  // signed out: sent to sign in, like any private page
  await open(page, "/admin")
  await expect(page).toHaveURL("/sign-in?redirect=%2Fadmin")

  // signed in but not an admin: the area does not even appear to exist
  await createSignedInUser(page, account)
  const response = await page.goto("/admin")
  expect(response?.status()).toBe(404)
  await expect(
    page.getByText("Page not found")
  ).toBeVisible()
  for (const path of [
    "/admin/audit",
    "/admin/audit?page=2",
  ]) {
    expect((await page.goto(path))?.status()).toBe(404)
  }
  await open(page, "/")
  await expect(
    page.getByRole("link", { name: "Admin" })
  ).toHaveCount(0)
})

test("an operator makes someone an admin with a command, and can take it away", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)

  const granted = adminCommand("grant", account.email)
  expect(granted.status).toBe(0)
  expect(granted.output).toContain("They are an admin now.")

  // the next page load shows the link, and the area opens
  await open(page, "/")
  await page.getByRole("link", { name: "Admin" }).click()
  await expect(page).toHaveURL("/admin")
  await expect(
    page.getByRole("heading", { name: "Admin", level: 1 })
  ).toBeVisible()
  await expect(
    page.getByText("Revenue, last 30 days", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("Orders waiting")
  ).toBeVisible()
  await expect(
    page.getByRole("img", { name: /Bar chart of revenue/ })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Dashboard" })
  ).toHaveAttribute("aria-current", "page")

  // the grant is in the audit log, as the operator's
  await page
    .getByRole("link", { name: "Audit log" })
    .click()
  const row = page.getByRole("row").filter({
    hasText: `${account.email} was made an admin`,
  })
  await expect(row).toBeVisible()
  await expect(row.getByText("operator")).toBeVisible()

  // taking it away closes the area again
  const revoked = adminCommand(
    "revoke",
    account.email,
    "--force"
  )
  expect(revoked.status).toBe(0)
  const response = await page.goto("/admin")
  expect(response?.status()).toBe(404)
})

test("the command says what is wrong instead of failing silently", async ({
  page,
  account,
}) => {
  const unknown = adminCommand(
    "grant",
    `nobody-${account.email}`
  )
  expect(unknown.status).toBe(1)
  expect(unknown.output).toContain(
    "No account has that email address."
  )

  // an account that never verified its address is not made an admin
  await page.goto("/sign-up")
  await page.waitForLoadState("networkidle")
  await page.getByLabel("Name").fill(account.name)
  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Password").fill(account.password)
  await page
    .getByRole("button", { name: "Create account" })
    .click()
  await expect(page.getByRole("status")).toContainText(
    "We sent a verification link"
  )
  const unverified = adminCommand("grant", account.email)
  expect(unverified.status).toBe(1)
  expect(unverified.output).toContain("has not verified")

  expect(
    adminCommand("revoke", account.email).output
  ).toContain("not an admin")
})
