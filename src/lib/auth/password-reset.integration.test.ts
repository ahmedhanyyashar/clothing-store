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
const newPassword = "a-brand-new-password"

/** The reset token from the most recent email, as the recipient's link carries it. */
function lastResetToken() {
  const message = vi.mocked(sendEmail).mock.lastCall?.[0]
  const link = message?.text.match(/https?:\/\/\S+/)?.[0]
  if (!link)
    throw new Error("no email with a link was sent")
  return new URL(link).pathname.split("/").pop()!
}

async function createVerifiedUser() {
  await auth.api.signUpEmail({ body: account })
  await prisma.user.update({
    where: { email: account.email },
    data: { emailVerified: true },
  })
  vi.mocked(sendEmail).mockClear()
}

describe("password reset", () => {
  beforeEach(async () => {
    await resetDb()
    vi.mocked(sendEmail).mockClear()
  })

  it("emails a reset link to a registered address", async () => {
    await createVerifiedUser()

    await auth.api.requestPasswordReset({
      body: {
        email: account.email,
        redirectTo: "/reset-password",
      },
    })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: account.email })
    )
  })

  it("answers the same way for an unknown address, and sends nothing", async () => {
    await expect(
      auth.api.requestPasswordReset({
        body: {
          email: "nobody@example.com",
          redirectTo: "/reset-password",
        },
      })
    ).resolves.toBeDefined()

    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("replaces the password: the new one works and the old one does not", async () => {
    await createVerifiedUser()
    await auth.api.requestPasswordReset({
      body: {
        email: account.email,
        redirectTo: "/reset-password",
      },
    })

    await auth.api.resetPassword({
      body: { newPassword, token: lastResetToken() },
    })

    await expect(
      auth.api.signInEmail({
        body: {
          email: account.email,
          password: newPassword,
        },
      })
    ).resolves.toBeDefined()
    await expect(
      auth.api.signInEmail({
        body: {
          email: account.email,
          password: account.password,
        },
      })
    ).rejects.toThrow()
  })

  it("signs the user out everywhere", async () => {
    await createVerifiedUser()
    await auth.api.signInEmail({
      body: {
        email: account.email,
        password: account.password,
      },
    })
    expect(await prisma.session.count()).toBe(1)
    await auth.api.requestPasswordReset({
      body: {
        email: account.email,
        redirectTo: "/reset-password",
      },
    })

    await auth.api.resetPassword({
      body: { newPassword, token: lastResetToken() },
    })

    expect(await prisma.session.count()).toBe(0)
  })

  it("rejects a token that was never issued", async () => {
    await expect(
      auth.api.resetPassword({
        body: { newPassword, token: "not-a-real-token" },
      })
    ).rejects.toThrow()
  })
})
