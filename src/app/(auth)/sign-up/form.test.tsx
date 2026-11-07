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

import { SignUpForm } from "./form"

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: { social: vi.fn() },
    signUp: { email: vi.fn() },
  },
}))

async function fill(password: string) {
  const user = userEvent.setup()
  await user.type(
    screen.getByLabelText("Name"),
    "Ada Lovelace"
  )
  await user.type(
    screen.getByLabelText("Email"),
    "ada@example.com"
  )
  await user.type(
    screen.getByLabelText("Password"),
    password
  )
  await user.click(
    screen.getByRole("button", { name: "Create account" })
  )
}

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("rejects a short password before calling the server", async () => {
    render(<SignUpForm redirectTo="/" />)

    await fill("too-short")

    expect(
      await screen.findByText(
        "Password must be at least 12 characters"
      )
    ).toBeInTheDocument()
    expect(authClient.signUp.email).not.toHaveBeenCalled()
  })

  it("tells the user to check their email after signing up", async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    render(<SignUpForm redirectTo="/" />)

    await fill("a-long-enough-password")

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent(
      "We sent a verification link to ada@example.com"
    )
    expect(authClient.signUp.email).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "a-long-enough-password",
      callbackURL: "/sign-in",
    })
  })

  it("shows the server's message when sign-up fails", async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue({
      data: null,
      error: { message: "Too many requests" },
    } as never)
    render(<SignUpForm redirectTo="/" />)

    await fill("a-long-enough-password")

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Too many requests")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <SignUpForm redirectTo="/" />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
