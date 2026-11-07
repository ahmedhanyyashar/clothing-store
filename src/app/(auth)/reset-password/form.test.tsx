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

import { ResetPasswordForm } from "./form"

vi.mock("@/lib/auth/client", () => ({
  authClient: { resetPassword: vi.fn() },
}))

async function submit(
  password: string,
  confirmation: string
) {
  const user = userEvent.setup()
  await user.type(
    screen.getByLabelText("New password"),
    password
  )
  await user.type(
    screen.getByLabelText("Confirm new password"),
    confirmation
  )
  await user.click(
    screen.getByRole("button", { name: "Set new password" })
  )
}

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("rejects passwords that do not match", async () => {
    render(<ResetPasswordForm token="t0ken" />)

    await submit(
      "a-long-enough-password",
      "a-different-password"
    )

    expect(
      await screen.findByText("Passwords do not match")
    ).toBeInTheDocument()
    expect(authClient.resetPassword).not.toHaveBeenCalled()
  })

  it("sets the new password using the token from the link", async () => {
    vi.mocked(authClient.resetPassword).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    render(<ResetPasswordForm token="t0ken" />)

    await submit(
      "a-long-enough-password",
      "a-long-enough-password"
    )

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent("Password updated")
    expect(authClient.resetPassword).toHaveBeenCalledWith({
      newPassword: "a-long-enough-password",
      token: "t0ken",
    })
  })

  it("shows the server's message when the link has expired", async () => {
    vi.mocked(authClient.resetPassword).mockResolvedValue({
      data: null,
      error: { message: "Invalid token" },
    } as never)
    render(<ResetPasswordForm token="stale" />)

    await submit(
      "a-long-enough-password",
      "a-long-enough-password"
    )

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Invalid token")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ResetPasswordForm token="t0ken" />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
