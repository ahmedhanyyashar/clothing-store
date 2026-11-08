import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

import { adminCommand } from "./support/admin"
import { createSignedInUser, open } from "./support/flows"
import { expect, test } from "./support/test"

/** Fails with the rule, the page's own words for the element, and where it is. */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(
    violations.map((v) => ({
      rule: v.id,
      url: page.url(),
      nodes: v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3),
    }))
  ).toEqual([])
}

test("the public pages have no accessibility violations", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/shop",
    "/cart",
    "/sign-in",
    "/sign-up",
    "/privacy",
    "/terms",
    "/cookies",
  ]) {
    await open(page, path)
    await expectNoViolations(page)
  }

  // a product page, reached the way a shopper reaches it
  await open(page, "/shop")
  await page
    .getByRole("link", { name: /Tee/ })
    .first()
    .click()
  await expect(
    page.getByRole("heading", { level: 1 })
  ).toBeVisible()
  await expectNoViolations(page)
})

test("the cookie banner has no accessibility violations", async ({
  page,
  context,
}) => {
  await context.clearCookies()
  await open(page, "/")
  await expect(
    page.getByRole("region", { name: "Cookie consent" })
  ).toBeVisible()
  await expectNoViolations(page)
})

test("the account and admin pages have no accessibility violations", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  for (const path of ["/account", "/account/settings"]) {
    await open(page, path)
    await expectNoViolations(page)
  }

  expect(adminCommand("grant", account.email).status).toBe(
    0
  )
  for (const path of [
    "/admin",
    "/admin/orders",
    "/admin/products",
    "/admin/products/new",
    "/admin/audit",
  ]) {
    await open(page, path)
    await expectNoViolations(page)
  }
})
