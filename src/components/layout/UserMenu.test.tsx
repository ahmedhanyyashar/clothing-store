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

import { UserMenu } from "./UserMenu"

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}))
vi.mock("@/lib/auth/client", () => ({
  authClient: { useSession: vi.fn(), signOut: vi.fn() },
}))

function session(data: unknown, isPending = false) {
  vi.mocked(authClient.useSession).mockReturnValue({
    data,
    isPending,
  } as never)
}

describe("UserMenu", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("offers sign in and sign up to a signed-out visitor", async () => {
    session(null)
    const { container } = render(<UserMenu />)

    expect(
      screen.getByRole("link", { name: "Sign in" })
    ).toHaveAttribute("href", "/sign-in")
    expect(
      screen.getByRole("link", { name: "Sign up" })
    ).toHaveAttribute("href", "/sign-up")
    expect(await axe(container)).toHaveNoViolations()
  })

  it("shows nothing interactive while the session loads", () => {
    session(undefined, true)
    render(<UserMenu />)

    expect(
      screen.queryByRole("link")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button")
    ).not.toBeInTheDocument()
  })

  it("links a signed-in user to their account and signs them out", async () => {
    session({ user: { name: "Ada Lovelace" } })
    vi.mocked(authClient.signOut).mockResolvedValue(
      {} as never
    )
    const { container } = render(<UserMenu />)

    expect(
      screen.getByRole("link", {
        name: "Account of Ada Lovelace",
      })
    ).toHaveAttribute("href", "/account")
    expect(await axe(container)).toHaveNoViolations()

    await userEvent.click(
      screen.getByRole("button", { name: "Sign out" })
    )

    expect(authClient.signOut).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith("/")
    expect(refresh).toHaveBeenCalledOnce()
  })
})

describe("UserMenu and the admin area", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("links an admin to the admin area", () => {
    session({ user: { name: "Ada", role: "ADMIN" } })
    render(<UserMenu />)

    expect(
      screen.getByRole("link", { name: "Admin" })
    ).toHaveAttribute("href", "/admin")
  })

  it("shows an ordinary user no such link", () => {
    session({ user: { name: "Bob", role: "USER" } })
    render(<UserMenu />)

    expect(
      screen.queryByRole("link", { name: "Admin" })
    ).not.toBeInTheDocument()
  })
})
