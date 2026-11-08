import { open } from "./support/flows"
import { expect, test } from "./support/test"

const GA = 'script[src*="googletagmanager.com/gtag/js"]'

test.beforeEach(async ({ context, page }) => {
  // a first visit: no choice made yet
  await context.clearCookies()
  // never reach Google from a test
  await page.route("**/gtag/js**", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "",
    })
  )
})

test("nothing from Google loads until analytics is allowed, and the choice can be changed", async ({
  page,
}) => {
  await open(page, "/")
  const banner = page.getByRole("region", {
    name: "Cookie consent",
  })
  await expect(banner).toBeVisible()
  await expect(page.locator(GA)).toHaveCount(0)

  // essential only: the banner goes and stays gone, with no analytics
  await banner
    .getByRole("button", { name: "Essential only" })
    .click()
  await expect(banner).toBeHidden()
  await page.reload()
  await expect(banner).toBeHidden()
  await expect(page.locator(GA)).toHaveCount(0)

  // changing their mind asks again, and allowing loads the script
  await page
    .getByRole("button", { name: "Cookie settings" })
    .click()
  await expect(banner).toBeVisible()
  await banner
    .getByRole("button", { name: "Allow analytics" })
    .click()
  await expect(page.locator(GA)).toHaveCount(1)

  // withdrawing stops it
  await page
    .getByRole("button", { name: "Cookie settings" })
    .click()
  await expect(banner).toBeVisible()
  await expect(page.locator(GA)).toHaveCount(0)
})

test("every page has its own policy, with no violation, and the legal pages are linked", async ({
  context,
  page,
}) => {
  // the banner is not what this test is about, and would cover the footer
  await context.addCookies([
    {
      name: "consent",
      value: "denied",
      url: "http://localhost:3100",
    },
  ])
  const violations: string[] = []
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy"))
      violations.push(message.text())
  })

  const first = await page.goto("/")
  const second = await page.goto("/")
  const policy = (r: typeof first) =>
    r!.headers()["content-security-policy"]
  expect(policy(first)).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/
  )
  expect(policy(first)).toContain("frame-ancestors 'none'")
  expect(policy(second)).not.toBe(policy(first))

  for (const [link, heading] of [
    ["Privacy", "Privacy policy"],
    ["Terms", "Terms of sale"],
    ["Cookies", "Cookie policy"],
  ]) {
    await open(page, "/shop")
    await page
      .getByRole("navigation", { name: "Legal" })
      .getByRole("link", { name: link })
      .click()
    await expect(
      page.getByRole("heading", { level: 1, name: heading })
    ).toBeVisible()
  }
  expect(violations).toEqual([])
})
