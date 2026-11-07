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

import { SignInForm } from "./form"

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: { email: vi.fn(), social: vi.fn() },
    sendVerificationEmail: vi.fn(),
  },
}))

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(
    screen.getByLabelText("Email"),
    "ada@example.com"
  )
  await user.type(
    screen.getByLabelText("Password"),
    "correct horse battery"
  )
  await user.click(
    screen.getByRole("button", { name: "Sign in" })
  )
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("asks for the missing fields before calling the server", async () => {
    render(<SignInForm redirectTo="/" />)

    await userEvent.click(
      screen.getByRole("button", { name: "Sign in" })
    )

    expect(
      await screen.findByText("Enter a valid email address")
    ).toBeInTheDocument()
    expect(authClient.signIn.email).not.toHaveBeenCalled()
  })

  it("signs in and sends the user on to where they were going", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    render(<SignInForm redirectTo="/orders" />)

    await fillAndSubmit()

    expect(authClient.signIn.email).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct horse battery",
      callbackURL: "/orders",
    })
  })

  it("shows the server's message when the credentials are wrong", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      data: null,
      error: { message: "Invalid email or password" },
    } as never)
    render(<SignInForm redirectTo="/" />)

    await fillAndSubmit()

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Invalid email or password")
  })

  it("offers to resend the link when the address is not verified", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      data: null,
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Email not verified",
      },
    } as never)
    render(<SignInForm redirectTo="/" />)

    await fillAndSubmit()
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Send the link again",
      })
    )

    expect(
      authClient.sendVerificationEmail
    ).toHaveBeenCalledWith({
      email: "ada@example.com",
      callbackURL: "/sign-in",
    })
    expect(
      screen.getByRole("button", { name: "Link sent" })
    ).toBeDisabled()
  })

  it("starts Google sign-in", async () => {
    vi.mocked(authClient.signIn.social).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    render(<SignInForm redirectTo="/orders" />)

    await userEvent.click(
      screen.getByRole("button", {
        name: /continue with google/i,
      })
    )

    expect(authClient.signIn.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/orders",
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <SignInForm
        redirectTo="/"
        notice="That link has expired."
      />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
