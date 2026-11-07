import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import { describe, expect, it } from "vitest"

import type { ProductDetails } from "@/lib/catalog/queries"

import { ProductGallery } from "./ProductGallery"
import { ProductInfo } from "./ProductInfo"

const product: ProductDetails = {
  id: "abc123",
  name: "Slim Fit Jeans",
  description: "Stretch denim cut close through the leg.",
  priceCents: 5499,
  category: "MEN",
  type: "JEANS",
  images: [
    { url: "/products/front.webp" },
    { url: "/products/back.webp" },
  ],
  sizes: [
    { label: "30", stock: 6 },
    { label: "32", stock: 0 },
  ],
  colors: [{ name: "Dark Blue", hex: "#2f4766" }],
}

describe("ProductInfo", () => {
  it("shows the name, the formatted price, the category and the description", () => {
    render(<ProductInfo product={product} />)

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Slim Fit Jeans",
      })
    ).toBeInTheDocument()
    expect(screen.getByText("$54.99")).toBeInTheDocument()
    expect(
      screen.getByText(/Men · Jeans/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Stretch denim/)
    ).toBeInTheDocument()
  })

  it("lets the shopper pick a size, and tells a screen reader which are sold out", () => {
    render(<ProductInfo product={product} />)

    expect(
      screen.getByRole("radio", { name: "30" })
    ).toBeEnabled()
    expect(
      screen.getByRole("radio", { name: "32 (sold out)" })
    ).toBeDisabled()
    expect(screen.getByText("In stock")).toBeInTheDocument()
  })

  it("says sold out when no size has stock", () => {
    render(
      <ProductInfo
        product={{
          ...product,
          sizes: product.sizes.map((size) => ({
            ...size,
            stock: 0,
          })),
        }}
      />
    )

    expect(
      screen.getByText("Sold out", { selector: "p" })
    ).toBeInTheDocument()
    expect(
      screen.queryByText("In stock")
    ).not.toBeInTheDocument()
  })

  it("names each color, and omits the section when there are none", () => {
    const { rerender } = render(
      <ProductInfo product={product} />
    )
    expect(
      screen.getByText("Dark Blue")
    ).toBeInTheDocument()

    rerender(
      <ProductInfo product={{ ...product, colors: [] }} />
    )
    expect(
      screen.queryByRole("heading", { name: "Colors" })
    ).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ProductInfo product={product} />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})

describe("ProductGallery", () => {
  it("shows the first image large, named after the product", () => {
    render(
      <ProductGallery
        images={product.images}
        name={product.name}
      />
    )

    expect(
      screen.getByRole("img", { name: "Slim Fit Jeans" })
    ).toBeInTheDocument()
  })

  it("lets the shopper pick another image from the thumbnails", async () => {
    render(
      <ProductGallery
        images={product.images}
        name={product.name}
      />
    )

    await userEvent.click(
      screen.getByRole("button", {
        name: "Show image 2 of 2",
      })
    )

    expect(
      screen.getByRole("button", {
        name: "Show image 2 of 2",
      })
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      screen
        .getByRole("img", { name: "Slim Fit Jeans" })
        .getAttribute("src")
    ).toContain("back.webp")
  })

  it("shows no thumbnails for a single image", () => {
    render(
      <ProductGallery
        images={[{ url: "/products/one.webp" }]}
        name="Tee"
      />
    )

    expect(
      screen.queryByRole("button")
    ).not.toBeInTheDocument()
  })

  it("renders a labelled placeholder when there are no images", () => {
    render(<ProductGallery images={[]} name="Tee" />)

    expect(
      screen.getByRole("img", {
        name: "No image available",
      })
    ).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ProductGallery
        images={product.images}
        name={product.name}
      />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
