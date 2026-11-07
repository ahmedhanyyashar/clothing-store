import { render } from "@testing-library/react"
import { axe } from "jest-axe"
import { ThemeProvider } from "next-themes"
import { describe, expect, it, vi } from "vitest"

import { Footer } from "./Footer"
import { Header } from "./Header"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock("@/lib/cart/actions", () => ({
  loadCartProducts: vi.fn(),
}))
vi.mock("@/lib/auth/client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
  },
}))

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
