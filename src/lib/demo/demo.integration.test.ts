import { beforeEach, describe, expect, it } from "vitest"

import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/client"
import { resetDb } from "@/test/reset-db"

import { seedDemoCustomer } from "../../../prisma/demo"
import {
  DEMO_CUSTOMER_EMAIL,
  DEMO_READ_ONLY,
} from "./accounts"
import { demoAvailable, signInAsDemo } from "./sign-in"

const PASSWORD = "demo-test-password"
const on = { DEMO_MODE: true, DEMO_PASSWORD: PASSWORD }

beforeEach(async () => {
  await resetDb()
  await seedDemoCustomer()
})

/** The cookie a browser would send after signing in as the demo customer. */
async function demoCookie() {
  const { headers } = await auth.api.signInEmail({
    body: {
      email: DEMO_CUSTOMER_EMAIL,
      password: PASSWORD,
    },
    returnHeaders: true,
  })
  return new Headers({
    cookie: (headers.get("set-cookie") ?? "")
      .split(/,(?=\s*[\w.-]+=)/)
      .map((c) => c.split(";")[0].trim())
      .join("; "),
  })
}

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
    expect(user.isDemo).toBe(true)
    expect(
      await prisma.session.count({
        where: { userId: user.id },
      })
    ).toBe(1)
  })

  it("is not offered unless demo mode is on and a password is set", async () => {
    expect(demoAvailable({})).toBe(false)
    expect(demoAvailable({ DEMO_MODE: true })).toBe(false)
    expect(demoAvailable({ DEMO_PASSWORD: PASSWORD })).toBe(
      false
    )
    expect(demoAvailable(on)).toBe(true)

    const result = await signInAsDemo(
      "customer",
      new Headers(),
      {
        DEMO_PASSWORD: PASSWORD,
      }
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

describe("what a demo account cannot do", () => {
  it.each([
    [
      "change its password",
      (headers: Headers) =>
        auth.api.changePassword({
          body: {
            currentPassword: PASSWORD,
            newPassword: "another-long-password",
          },
          headers,
        }),
    ],
    [
      "change its name",
      (headers: Headers) =>
        auth.api.updateUser({
          body: { name: "Someone Else" },
          headers,
        }),
    ],
    [
      "delete itself",
      (headers: Headers) =>
        auth.api.deleteUser({
          body: { password: PASSWORD },
          headers,
        }),
    ],
    [
      "sign everyone else out",
      (headers: Headers) =>
        auth.api.revokeSessions({ headers }),
    ],
  ])("cannot %s", async (_what, attempt) => {
    const headers = await demoCookie()

    await expect(attempt(headers)).rejects.toMatchObject({
      status: "FORBIDDEN",
      body: { message: DEMO_READ_ONLY },
    })

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: DEMO_CUSTOMER_EMAIL },
    })
    expect(user.name).toBe("Demo Shopper")
  })

  it("is the flag that decides, not the address", async () => {
    const headers = await demoCookie()
    await prisma.user.update({
      where: { email: DEMO_CUSTOMER_EMAIL },
      data: { isDemo: false },
    })

    await auth.api.updateUser({
      body: { name: "Changed" },
      headers,
    })

    expect(
      (
        await prisma.user.findUniqueOrThrow({
          where: { email: DEMO_CUSTOMER_EMAIL },
        })
      ).name
    ).toBe("Changed")
  })
})
