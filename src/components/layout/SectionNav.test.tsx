import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it, vi } from "vitest"

import { isCurrent, SectionNav } from "./SectionNav"

const pathname = vi.hoisted(() => ({ current: "/admin" }))
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}))

const sections = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/audit", label: "Audit log" },
] as const

describe("isCurrent", () => {
  it.each([
    ["/admin", "/admin", true],
    ["/admin/orders", "/admin", false],
    ["/admin/orders", "/admin/orders", true],
    ["/admin/orders/CS-ABC", "/admin/orders", true],
    ["/admin/ordersx", "/admin/orders", false],
    ["/account/orders", "/admin/orders", false],
  ])("%s for %s is %s", (path, href, expected) => {
    expect(isCurrent(path, href)).toBe(expected)
  })
})

describe("SectionNav", () => {
  it("marks the section being viewed, including on its pages", () => {
    pathname.current = "/admin/audit/page-2"
    render(<SectionNav label="Admin" sections={sections} />)

    expect(
      screen.getByRole("link", { name: "Audit log" })
    ).toHaveAttribute("aria-current", "page")
    expect(
      screen.getByRole("link", { name: "Dashboard" })
    ).not.toHaveAttribute("aria-current")
  })

  it("is a navigation landmark with the given name", () => {
    render(<SectionNav label="Admin" sections={sections} />)

    expect(
      screen.getByRole("navigation", { name: "Admin" })
    ).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <SectionNav label="Admin" sections={sections} />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
