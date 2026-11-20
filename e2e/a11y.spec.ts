import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

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

// One test per page: the scans run side by side, and a failure names its page.
for (const path of [
  "/",
  "/shop",
  "/cart",
  "/sign-in",
  "/sign-up",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
]) {
  test(`${path} has no accessibility violations`, async ({
    page,
  }) => {
    await open(page, path)
    await expectNoViolations(page)
  })
}

test("a product page has no accessibility violations", async ({
  page,
}) => {
  // reached the way a shopper reaches it
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

for (const path of ["/account", "/account/settings"]) {
  test(`${path} has no accessibility violations`, async ({
    page,
    account,
  }) => {
    await createSignedInUser(page, account)
    await open(page, path)
    await expectNoViolations(page)
  })
}

for (const path of [
  "/admin",
  "/admin/orders",
  "/admin/products",
  "/admin/products/new",
  "/admin/audit",
]) {
  test(`${path} has no accessibility violations`, async ({
    page,
    account,
  }) => {
    await createSignedInUser(page, account, { admin: true })
    await open(page, path)
    await expectNoViolations(page)
  })
}
