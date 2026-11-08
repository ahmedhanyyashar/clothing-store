import { randomInt, randomUUID } from "node:crypto"

import { test as base } from "@playwright/test"

export { expect } from "@playwright/test"

export type Account = {
  name: string
  email: string
  password: string
}

function randomIp() {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`
}

export const test = base.extend<{ account: Account }>({
  // The cookie banner is covered by its own spec; elsewhere it would sit over
  // the page, so every test starts having chosen "essential only".
  context: async ({ context, baseURL }, provide) => {
    await context.addCookies([
      { name: "consent", value: "denied", url: baseURL! },
    ])
    await provide(context)
  },

  // Each test acts as its own client. The auth rate limiter counts requests
  // per address, so without this the tests would throttle one another.
  extraHTTPHeaders: async ({}, provide) => {
    await provide({ "x-forwarded-for": randomIp() })
  },

  // A new user per test, so tests share no state and need no cleanup.
  account: async ({}, provide) => {
    await provide({
      name: "Ada Lovelace",
      email: `e2e-${randomUUID().slice(0, 8)}@example.com`,
      password: "a-long-enough-password",
    })
  },
})
