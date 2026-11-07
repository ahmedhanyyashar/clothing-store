import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeProvider } from "next-themes"
import { describe, expect, it } from "vitest"

import { ThemeToggle } from "./ThemeToggle"

describe("ThemeToggle", () => {
  it("switches between light and dark", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    )

    await user.click(
      screen.getByRole("button", { name: /toggle theme/i })
    )
    expect(document.documentElement).toHaveClass("dark")

    await user.click(
      screen.getByRole("button", { name: /toggle theme/i })
    )
    expect(document.documentElement).not.toHaveClass("dark")
  })
})
