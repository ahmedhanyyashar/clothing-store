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

import { ForgotPasswordForm } from "./form"

vi.mock("@/lib/auth/client", () => ({
  authClient: { requestPasswordReset: vi.fn() },
}))

async function submit(email: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Email"), email)
  await user.click(
    screen.getByRole("button", { name: "Send reset link" })
  )
}

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("rejects a malformed email before calling the server", async () => {
    render(<ForgotPasswordForm />)

    await submit("not-an-email")

    expect(
      await screen.findByText("Enter a valid email address")
    ).toBeInTheDocument()
    expect(
      authClient.requestPasswordReset
    ).not.toHaveBeenCalled()
  })

  it("asks for a reset link and answers the same way for any address", async () => {
    vi.mocked(
      authClient.requestPasswordReset
    ).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    render(<ForgotPasswordForm />)

    await submit("ada@example.com")

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent(
      "If an account exists for ada@example.com"
    )
    expect(
      authClient.requestPasswordReset
    ).toHaveBeenCalledWith({
      email: "ada@example.com",
      redirectTo: "/reset-password",
    })
  })

  it("shows the server's message when the request fails", async () => {
    vi.mocked(
      authClient.requestPasswordReset
    ).mockResolvedValue({
      data: null,
      error: { message: "Too many requests" },
    } as never)
    render(<ForgotPasswordForm />)

    await submit("ada@example.com")

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Too many requests")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ForgotPasswordForm />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
