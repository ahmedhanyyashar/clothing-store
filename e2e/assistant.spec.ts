import AxeBuilder from "@axe-core/playwright"

import { createSignedInUser, open } from "./support/flows"
import { expect, test } from "./support/test"

// the test build answers with a fixed reply (AI_PROVIDER=mock)
const REPLY = "This is a canned reply from the test model."

async function ask(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", {
      name: "Open the shopping assistant",
    })
    .click()
  const panel = page.getByRole("region", {
    name: "Shopping assistant",
  })
  await panel
    .getByLabel("Your message")
    .fill("Any hoodies?")
  await panel.getByRole("button", { name: "Send" }).click()
  await expect(panel.getByText(REPLY)).toBeVisible()
  return panel
}

test("a visitor asks the assistant and gets a reply, and the panel is accessible", async ({
  page,
}) => {
  await open(page, "/")
  const panel = await ask(page)

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(violations.map((v) => v.id)).toEqual([])

  // closing keeps the conversation
  await panel
    .getByRole("button", { name: "Close the assistant" })
    .click()
  await page
    .getByRole("button", {
      name: "Open the shopping assistant",
    })
    .click()
  await expect(panel.getByText(REPLY)).toBeVisible()
  await expect(
    panel.getByRole("button", { name: "History" })
  ).toHaveCount(0)
})

test("a signed-in shopper's chat is kept, can be reopened and deleted", async ({
  page,
  account,
}) => {
  await createSignedInUser(page, account)
  await open(page, "/")
  const panel = await ask(page)

  await panel
    .getByRole("button", { name: "New chat" })
    .click()
  await expect(panel.getByText(REPLY)).toHaveCount(0)

  await panel
    .getByRole("button", { name: "History" })
    .click()
  await panel
    .getByRole("button", {
      name: "Any hoodies?",
      exact: true,
    })
    .click()
  await expect(panel.getByText(REPLY)).toBeVisible()

  await panel
    .getByRole("button", { name: "History" })
    .click()
  await panel
    .getByRole("button", {
      name: /Delete conversation Any hoodies/,
    })
    .click()
  await expect(
    panel.getByText("No saved conversations yet.")
  ).toBeVisible()
})

test("on a first visit the assistant opens above the cookie banner", async ({
  context,
  page,
}) => {
  await context.clearCookies()
  await open(page, "/")
  await expect(
    page.getByRole("region", { name: "Cookie consent" })
  ).toBeVisible()

  await ask(page)
})
