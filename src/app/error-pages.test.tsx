import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import { describe, expect, it, vi } from "vitest"

import ErrorPage from "./error"
import NotFound from "./not-found"

describe("not-found page", () => {
  it("links back home and has no accessibility violations", async () => {
    const { container } = render(<NotFound />)

    expect(
      screen.getByRole("link", { name: /back to home/i })
    ).toHaveAttribute("href", "/")
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe("error page", () => {
  it("offers a retry and has no accessibility violations", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const retry = vi.fn()
    const { container } = render(
      <ErrorPage error={new Error("boom")} retry={retry} />
    )

    await userEvent.click(
      screen.getByRole("button", { name: /try again/i })
    )

    expect(retry).toHaveBeenCalledOnce()
    expect(await axe(container)).toHaveNoViolations()
  })
})
