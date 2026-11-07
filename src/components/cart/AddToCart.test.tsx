import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import { beforeEach, describe, expect, it } from "vitest"

import { useCartStore } from "@/lib/cart/store"

import { AddToCart } from "./AddToCart"

const sizes = [
  { label: "S", stock: 2 },
  { label: "M", stock: 8 },
  { label: "L", stock: 0 },
]

beforeEach(() => {
  localStorage.clear()
  useCartStore.setState({ userId: null, lines: [] })
})

describe("AddToCart", () => {
  it("asks for a size before adding anything", async () => {
    render(<AddToCart productId="tee" sizes={sizes} />)

    await userEvent.click(
      screen.getByRole("button", { name: "Add to cart" })
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a size."
    )
    expect(useCartStore.getState().lines).toEqual([])
  })

  it("adds the chosen size and quantity, and links to the cart", async () => {
    render(<AddToCart productId="tee" sizes={sizes} />)

    await userEvent.click(
      screen.getByRole("radio", { name: "M" })
    )
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Quantity" }),
      "3"
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Add to cart" })
    )

    expect(useCartStore.getState().lines).toEqual([
      { productId: "tee", size: "M", quantity: 3 },
    ])
    expect(screen.getByRole("status")).toHaveTextContent(
      "Added to your cart."
    )
    expect(
      screen.getByRole("link", { name: "View cart" })
    ).toHaveAttribute("href", "/cart")
  })

  it("offers no more than the stock of the chosen size", async () => {
    render(<AddToCart productId="tee" sizes={sizes} />)

    await userEvent.click(
      screen.getByRole("radio", { name: "S" })
    )

    expect(
      screen
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual(["1", "2"])
  })

  it("says so when the cart cannot take all that was asked", async () => {
    render(<AddToCart productId="tee" sizes={sizes} />)
    await userEvent.click(
      screen.getByRole("radio", { name: "S" })
    )
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Quantity" }),
      "2"
    )
    const add = screen.getByRole("button", {
      name: "Add to cart",
    })

    await userEvent.click(add)
    await userEvent.click(add)

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your cart has the most we can offer."
    )
    expect(useCartStore.getState().lines[0].quantity).toBe(
      2
    )
  })

  it("disables a sold-out size and names it for screen readers", () => {
    render(<AddToCart productId="tee" sizes={sizes} />)

    expect(
      screen.getByRole("radio", { name: "L (sold out)" })
    ).toBeDisabled()
  })

  it("replaces the button when every size is sold out", () => {
    render(
      <AddToCart
        productId="tee"
        sizes={sizes.map((s) => ({ ...s, stock: 0 }))}
      />
    )

    expect(
      screen.getByRole("button", { name: "Sold out" })
    ).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AddToCart productId="tee" sizes={sizes} />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
