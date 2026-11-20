import { render, screen } from "@testing-library/react"
import type { UIMessage } from "ai"
import { axe } from "jest-axe"
import { describe, expect, it } from "vitest"

import { ChatMessage } from "./ChatMessage"

const reply = (parts: unknown[]) =>
  ({ id: "a1", role: "assistant", parts }) as UIMessage

describe("ChatMessage", () => {
  it("shows found products as links with prices, and has no violations", async () => {
    const { container } = render(
      <ChatMessage
        message={reply([
          { type: "text", text: "Here you go." },
          {
            type: "tool-searchProducts",
            state: "output-available",
            output: [
              {
                id: "p1",
                name: "Classic White Tee",
                price: "$24.99",
                inStock: false,
                imageUrl: null,
              },
            ],
          },
        ])}
      />
    )

    expect(
      screen.getByRole("link", {
        name: "Classic White Tee",
      })
    ).toHaveAttribute("href", "/products/p1")
    expect(
      screen.getByText(/\$24\.99 · Sold out/)
    ).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it("says so when a tool failed or found nothing", () => {
    render(
      <ChatMessage
        message={reply([
          {
            type: "tool-addToCart",
            state: "output-error",
            errorText: "That size is not available.",
          },
          {
            type: "tool-searchProducts",
            state: "output-available",
            output: [],
          },
        ])}
      />
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "That size is not available."
    )
    expect(
      screen.getByText("Nothing matched.")
    ).toBeInTheDocument()
  })
})
