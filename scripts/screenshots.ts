// pnpm screenshots
//
// Takes the pictures in docs/screenshots from a running copy of the shop that
// has the demo data (`pnpm db:seed:demo`), signing in with the demo buttons.
// BASE_URL says where the shop is (default http://localhost:3100).
import { chromium } from "@playwright/test"

const base = process.env.BASE_URL ?? "http://localhost:3100"
const out = "docs/screenshots"

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
})
// the cookie banner would sit over every picture
await context.addCookies([
  { name: "consent", value: "denied", url: base },
])
const page = await context.newPage()

/** Waits until every image on the page has actually loaded. */
const imagesLoaded = () =>
  page.waitForFunction(() =>
    [...document.images].every(
      (i) => i.complete && i.naturalWidth > 0
    )
  )

async function shot(
  name: string,
  path: string,
  full = false
) {
  await page.goto(`${base}${path}`, {
    waitUntil: "networkidle",
  })
  await imagesLoaded()
  await page.screenshot({
    path: `${out}/${name}.png`,
    fullPage: full,
  })
  console.log(`${name}.png`)
}

await shot("home", "/")
await shot("shop", "/shop")
await page.goto(`${base}/shop`, {
  waitUntil: "networkidle",
})
await page
  .getByRole("link", { name: /Classic White Tee/ })
  .first()
  .click()
await page.waitForURL(/\/products\//)
await page.waitForLoadState("networkidle")
await page.screenshot({ path: `${out}/product.png` })
console.log("product.png")

// the admin side, as the read-only demo admin
await page.goto(`${base}/sign-in`, {
  waitUntil: "networkidle",
})
await page
  .getByRole("button", { name: "Use the demo admin" })
  .click()
await page.waitForURL(/\/admin/)
await page.waitForLoadState("networkidle")
await page.screenshot({
  path: `${out}/admin-dashboard.png`,
  fullPage: true,
})
console.log("admin-dashboard.png")
await shot(
  "admin-orders",
  "/admin/orders?sort=total&dir=desc"
)
await shot("admin-products", "/admin/products")

await browser.close()
