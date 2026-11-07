import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it, vi } from "vitest"

import { AccountNav } from "./AccountNav"

const pathname = vi.hoisted(() => ({ current: "/account" }))
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}))

describe("AccountNav", () => {
  it("marks the section being viewed", () => {
    pathname.current = "/account/security"
    render(<AccountNav />)

    expect(
      screen.getByRole("link", { name: "Security" })
    ).toHaveAttribute("aria-current", "page")
    expect(
      screen.getByRole("link", { name: "Profile" })
    ).not.toHaveAttribute("aria-current")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<AccountNav />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
