import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it } from "vitest"

import type { ProductSummary } from "@/lib/catalog/queries"

import { ProductCard } from "./ProductCard"

const product: ProductSummary = {
  id: "abc123",
  name: "Classic White Tee",
  priceCents: 2499,
  category: "MEN",
  type: "T_SHIRTS",
  imageUrl: "/products/classic-white-tee.webp",
  inStock: true,
}

describe("ProductCard", () => {
  it("links to the product with its name and a formatted price", () => {
    render(<ProductCard product={product} />)

    expect(
      screen.getByRole("link", {
        name: "Classic White Tee",
      })
    ).toHaveAttribute("href", "/products/abc123")
    expect(screen.getByText("$24.99")).toBeInTheDocument()
  })

  it("has exactly one link, so keyboard users do not tab through duplicates", () => {
    render(<ProductCard product={product} />)

    expect(screen.getAllByRole("link")).toHaveLength(1)
  })

  it("marks a product with no stock as sold out", () => {
    render(
      <ProductCard
        product={{ ...product, inStock: false }}
      />
    )

    expect(screen.getByText("Sold out")).toBeInTheDocument()
  })

  it("does not say sold out while something is in stock", () => {
    render(<ProductCard product={product} />)

    expect(
      screen.queryByText("Sold out")
    ).not.toBeInTheDocument()
  })

  it("still renders when a product has no image", () => {
    render(
      <ProductCard
        product={{ ...product, imageUrl: null }}
      />
    )

    expect(
      screen.getByRole("link", {
        name: "Classic White Tee",
      })
    ).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ProductCard product={product} />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
