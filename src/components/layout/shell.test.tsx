import { render } from "@testing-library/react"
import { axe } from "jest-axe"
import { ThemeProvider } from "next-themes"
import { describe, expect, it } from "vitest"

import { Footer } from "./Footer"
import { Header } from "./Header"

describe("page shell", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <Header />
        <main>
          <h1>Page</h1>
        </main>
        <Footer />
      </ThemeProvider>
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
