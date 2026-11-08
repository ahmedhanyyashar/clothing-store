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
import { signInAsDemoAction } from "@/lib/demo/actions"

import { DemoSignIn } from "./DemoSignIn"

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}))
vi.mock("@/lib/demo/actions", () => ({
  signInAsDemoAction: vi.fn(),
}))
vi.mock("@/lib/auth/client", () => ({
  authClient: { $store: { notify: vi.fn() } },
}))

beforeEach(() => vi.resetAllMocks())

describe("DemoSignIn", () => {
  it("signs in as the shopper and goes where the visitor was headed", async () => {
    vi.mocked(signInAsDemoAction).mockResolvedValue({
      ok: true,
    })
    render(<DemoSignIn redirectTo="/checkout" />)

    await userEvent.click(
      screen.getByRole("button", {
        name: "Use the demo shopper",
      })
    )

    expect(signInAsDemoAction).toHaveBeenCalledWith(
      "customer"
    )
    expect(authClient.$store.notify).toHaveBeenCalledWith(
      "$sessionSignal"
    )
    expect(push).toHaveBeenCalledWith("/checkout")
    expect(refresh).toHaveBeenCalled()
  })

  it("takes the demo admin to the admin area", async () => {
    vi.mocked(signInAsDemoAction).mockResolvedValue({
      ok: true,
    })
    render(<DemoSignIn redirectTo="/checkout" />)

    await userEvent.click(
      screen.getByRole("button", {
        name: "Use the demo admin",
      })
    )

    expect(signInAsDemoAction).toHaveBeenCalledWith("admin")
    expect(push).toHaveBeenCalledWith("/admin")
  })

  it("says why it failed and stays put", async () => {
    vi.mocked(signInAsDemoAction).mockResolvedValue({
      ok: false,
      message: "Demo accounts are not available.",
    })
    render(<DemoSignIn redirectTo="/" />)

    await userEvent.click(
      screen.getByRole("button", {
        name: "Use the demo shopper",
      })
    )

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("not available")
    expect(push).not.toHaveBeenCalled()
    expect(
      screen.getByRole("button", {
        name: "Use the demo shopper",
      })
    ).toBeEnabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <DemoSignIn redirectTo="/" />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
