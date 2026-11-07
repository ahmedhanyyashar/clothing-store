import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { auth } from "@/lib/auth/auth"
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

/** The link from the most recent email, as the recipient would click it. */
function lastEmailLink() {
  const message = vi.mocked(sendEmail).mock.lastCall?.[0]
  const link = message?.text.match(/https?:\/\/\S+/)?.[0]
  if (!link)
    throw new Error("no email with a link was sent")
  return new URL(link)
}

describe("authentication", () => {
  beforeEach(async () => {
    await resetDb()
    vi.mocked(sendEmail).mockClear()
  })

  it("creates an unverified user and emails a verification link", async () => {
    await auth.api.signUpEmail({ body: account })

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: account.email },
    })
    expect(user.emailVerified).toBe(false)
    expect(user.role).toBe("USER")
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: account.email })
    )
  })

  it("refuses to sign in until the address is verified", async () => {
    await auth.api.signUpEmail({ body: account })

    await expect(
      auth.api.signInEmail({
        body: {
          email: account.email,
          password: account.password,
        },
      })
    ).rejects.toMatchObject({ status: "FORBIDDEN" })
  })

  it("signs in once the verification link has been used", async () => {
    await auth.api.signUpEmail({ body: account })
    const token = lastEmailLink().searchParams.get("token")!

    await auth.api.verifyEmail({ query: { token } })

    const result = await auth.api.signInEmail({
      body: {
        email: account.email,
        password: account.password,
      },
    })
    expect(result.user.email).toBe(account.email)
  })

  it("rejects a password shorter than 12 characters", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { ...account, password: "short" },
      })
    ).rejects.toThrow()
    expect(await prisma.user.count()).toBe(0)
  })

  it("answers a repeat sign-up like a new one, without creating a user", async () => {
    await auth.api.signUpEmail({ body: account })
    const original = await prisma.user.findUniqueOrThrow({
      where: { email: account.email },
    })

    // the response must not reveal that the address is already registered
    await expect(
      auth.api.signUpEmail({
        body: { ...account, name: "Someone Else" },
      })
    ).resolves.toBeDefined()

    expect(await prisma.user.count()).toBe(1)
    expect(
      await prisma.user.findUniqueOrThrow({
        where: { email: account.email },
      })
    ).toEqual(original)
  })

  it("does not let a sign-up request choose its own role", async () => {
    const body = { ...account, role: "ADMIN" }

    await auth.api
      .signUpEmail({ body })
      .catch(() => undefined)

    const user = await prisma.user.findUnique({
      where: { email: account.email },
    })
    expect(user?.role ?? "USER").toBe("USER")
  })
})
