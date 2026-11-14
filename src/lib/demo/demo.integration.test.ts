import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import { resetDb } from "@/test/reset-db"

import { seedDemoCustomer } from "../../../prisma/demo"
import { DEMO_CUSTOMER_EMAIL } from "./accounts"
import { demoAvailable, signInAsDemo } from "./sign-in"

const PASSWORD = "demo-test-password"
const on = { DEMO_PASSWORD: PASSWORD }

beforeEach(async () => {
  await resetDb()
  await seedDemoCustomer()
})

describe("signing in as a demo account", () => {
  it("opens a session for the demo customer", async () => {
    const result = await signInAsDemo(
      "customer",
      new Headers(),
      on
    )

    expect(result).toEqual({ ok: true })
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: DEMO_CUSTOMER_EMAIL },
    })
    expect(
      await prisma.session.count({
        where: { userId: user.id },
      })
    ).toBe(1)
  })

  it("is not offered unless a password is set", async () => {
    expect(demoAvailable({})).toBe(false)
    expect(demoAvailable(on)).toBe(true)

    const result = await signInAsDemo(
      "customer",
      new Headers(),
      {}
    )

    expect(result.ok).toBe(false)
    expect(await prisma.session.count()).toBe(0)
  })

  it("says so, without detail, when the account cannot be opened", async () => {
    const result = await signInAsDemo(
      "admin",
      new Headers(),
      on
    )

    // the demo admin was not seeded here
    expect(result).toMatchObject({ ok: false })
    expect(await prisma.session.count()).toBe(0)
  })
})
