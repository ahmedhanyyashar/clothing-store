import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { authClient } from "@/lib/auth/client"

import { ChangePasswordForm } from "./change-password-form"

vi.mock("@/lib/auth/client", () => ({
  authClient: { changePassword: vi.fn() },
}))

const OLD = "the-old-password-1"
const NEW = "a-brand-new-password"

async function fill(
  current: string,
  next: string,
  again = next
) {
  const user = userEvent.setup()
  await user.type(
    screen.getByLabelText("Current password"),
    current
  )
  await user.type(
    screen.getByLabelText("New password"),
    next
  )
  await user.type(
    screen.getByLabelText("Confirm new password"),
    again
  )
  return user
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(
    screen.getByRole("button", { name: "Change password" })
  )

beforeEach(() => vi.resetAllMocks())

describe("ChangePasswordForm", () => {
  it("sends the change and signs out other devices by default", async () => {
    vi.mocked(authClient.changePassword).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    render(<ChangePasswordForm />)

    await submit(await fill(OLD, NEW))

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent("Password updated.")
    expect(authClient.changePassword).toHaveBeenCalledWith({
      currentPassword: OLD,
      newPassword: NEW,
      revokeOtherSessions: true,
    })
    // the typed passwords are not left on screen
    expect(
      screen.getByLabelText("Current password")
    ).toHaveValue("")
  })

  it("keeps other devices signed in when asked to", async () => {
    vi.mocked(authClient.changePassword).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    render(<ChangePasswordForm />)
    const user = await fill(OLD, NEW)

    await user.click(
      screen.getByRole("checkbox", {
        name: "Sign me out on my other devices",
      })
    )
    await submit(user)

    await screen.findByRole("status")
    expect(authClient.changePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        revokeOtherSessions: false,
      })
    )
  })

  it.each([
    [
      "does not match",
      [OLD, NEW, "something-else-entirely"],
      "Passwords do not match",
    ],
    [
      "is too short",
      [OLD, "short", "short"],
      "at least 12 characters",
    ],
    [
      "is the same as the current one",
      [OLD, OLD, OLD],
      "different from the current one",
    ],
  ])(
    "refuses a new password that %s",
    async (_why, [current, next, again], message) => {
      render(<ChangePasswordForm />)

      await submit(await fill(current, next, again))

      expect(
        await screen.findByText(new RegExp(message))
      ).toBeInTheDocument()
      expect(
        authClient.changePassword
      ).not.toHaveBeenCalled()
    }
  )

  it("shows the server's message when the current password is wrong", async () => {
    vi.mocked(authClient.changePassword).mockResolvedValue({
      data: null,
      error: { message: "Invalid password" },
    } as never)
    render(<ChangePasswordForm />)

    await submit(await fill("wrong-one-entirely", NEW))

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Invalid password")
    expect(
      screen.queryByText("Password updated.")
    ).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ChangePasswordForm />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
