import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { auth } from "@/lib/auth/auth"
import { hasPassword } from "@/lib/auth/session"
import { prisma } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/mailer"
import { resetDb } from "@/test/reset-db"

vi.mock("@/lib/email/mailer", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

const account = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "a-long-enough-password",
}
const NEW_PASSWORD = "another-long-password"

/** Signs a new, verified user in and returns the headers a browser would send. */
async function signedIn() {
  await auth.api.signUpEmail({ body: account })
  const message = vi.mocked(sendEmail).mock.lastCall?.[0]
  const link = message?.text.match(/https?:\/\/\S+/)?.[0]
  const token = new URL(link!).searchParams.get("token")!
  await auth.api.verifyEmail({ query: { token } })

  const { headers } = await auth.api.signInEmail({
    body: {
      email: account.email,
      password: account.password,
    },
    returnHeaders: true,
  })
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ")
  vi.mocked(sendEmail).mockClear()
  return new Headers({ cookie })
}

const userCount = () => prisma.user.count()

beforeEach(async () => {
  await resetDb()
  vi.mocked(sendEmail).mockClear()
})

describe("changing the password", () => {
  it("replaces the password and tells the owner by email", async () => {
    const headers = await signedIn()

    await auth.api.changePassword({
      headers,
      body: {
        currentPassword: account.password,
        newPassword: NEW_PASSWORD,
      },
    })

    await expect(
      auth.api.signInEmail({
        body: {
          email: account.email,
          password: account.password,
        },
      })
    ).rejects.toMatchObject({ status: "UNAUTHORIZED" })
    const result = await auth.api.signInEmail({
      body: {
        email: account.email,
        password: NEW_PASSWORD,
      },
    })
    expect(result.user.email).toBe(account.email)

    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: account.email,
        subject: "Your Clothing Store password was changed",
      })
    )
  })

  it("refuses a wrong current password, and sends no email", async () => {
    const headers = await signedIn()

    await expect(
      auth.api.changePassword({
        headers,
        body: {
          currentPassword: "not-the-password-at-all",
          newPassword: NEW_PASSWORD,
        },
      })
    ).rejects.toMatchObject({ status: "BAD_REQUEST" })

    expect(sendEmail).not.toHaveBeenCalled()
    const result = await auth.api.signInEmail({
      body: {
        email: account.email,
        password: account.password,
      },
    })
    expect(result.user.email).toBe(account.email)
  })

  it("can end the user's other sessions", async () => {
    const headers = await signedIn()
    await auth.api.signInEmail({
      body: {
        email: account.email,
        password: account.password,
      },
    })
    expect(await prisma.session.count()).toBeGreaterThan(1)

    await auth.api.changePassword({
      headers,
      body: {
        currentPassword: account.password,
        newPassword: NEW_PASSWORD,
        revokeOtherSessions: true,
      },
    })

    expect(await prisma.session.count()).toBe(1)
  })

  it("needs a signed-in user", async () => {
    await signedIn()

    await expect(
      auth.api.changePassword({
        headers: new Headers(),
        body: {
          currentPassword: account.password,
          newPassword: NEW_PASSWORD,
        },
      })
    ).rejects.toMatchObject({ status: "UNAUTHORIZED" })
  })
})

describe("deleting the account", () => {
  it("removes the user and everything tied to them", async () => {
    const headers = await signedIn()

    await auth.api.deleteUser({
      headers,
      body: { password: account.password },
    })

    expect(await userCount()).toBe(0)
    expect(await prisma.session.count()).toBe(0)
    expect(await prisma.account.count()).toBe(0)
  })

  it("keeps the account when the password is wrong", async () => {
    const headers = await signedIn()

    await expect(
      auth.api.deleteUser({
        headers,
        body: { password: "not-the-password-at-all" },
      })
    ).rejects.toMatchObject({ status: "BAD_REQUEST" })

    expect(await userCount()).toBe(1)
  })
})

describe("hasPassword", () => {
  it("is true for a user who signed up with a password", async () => {
    await signedIn()
    const user = await prisma.user.findFirstOrThrow()

    expect(await hasPassword(user.id)).toBe(true)
  })

  it("is false for a user who only signs in with Google", async () => {
    const user = await prisma.user.create({
      data: {
        id: "google-user",
        name: "Grace",
        email: "grace@example.com",
        emailVerified: true,
        accounts: {
          create: {
            id: "acc-1",
            accountId: "google-123",
            providerId: "google",
          },
        },
      },
    })

    expect(await hasPassword(user.id)).toBe(false)
  })
})
