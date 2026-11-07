import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { loadCartProducts } from "@/lib/cart/actions"
import type { CartProduct } from "@/lib/cart/model"
import { useCartStore } from "@/lib/cart/store"

import { CartView } from "./CartView"

vi.mock("@/lib/cart/actions", () => ({
  loadCartProducts: vi.fn(),
}))

const lookup = vi.mocked(loadCartProducts)

const tee: CartProduct = {
  productId: "tee",
  size: "M",
  name: "Classic Tee",
  priceCents: 2499,
  imageUrl: "/products/tee.webp",
  stock: 5,
}

function fill(
  ...lines: { size: string; quantity: number }[]
) {
  useCartStore.setState({
    userId: null,
    lines: lines.map((l) => ({ productId: "tee", ...l })),
  })
}

beforeEach(() => {
  localStorage.clear()
  lookup.mockReset()
  useCartStore.setState({ userId: null, lines: [] })
})

describe("CartView", () => {
  it("says so when the cart is empty", async () => {
    render(<CartView />)

    expect(
      await screen.findByText("Your cart is empty.")
    ).toBeInTheDocument()
    expect(lookup).not.toHaveBeenCalled()
  })

  it("prices every line from the server's details", async () => {
    lookup.mockResolvedValue([tee])
    fill({ size: "M", quantity: 2 })

    render(<CartView />)

    expect(
      await screen.findByRole("link", {
        name: "Classic Tee",
      })
    ).toHaveAttribute("href", "/products/tee")
    expect(
      screen.getByText("Size M · $24.99")
    ).toBeInTheDocument()
    expect(
      screen.getByText("$49.98", { selector: "p" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Subtotal").nextSibling
    ).toHaveTextContent("$49.98")
  })

  it("updates the total when the quantity changes, without asking again", async () => {
    lookup.mockResolvedValue([tee])
    fill({ size: "M", quantity: 1 })
    render(<CartView />)
    await screen.findByText("Classic Tee")

    await userEvent.selectOptions(
      screen.getByRole("combobox", {
        name: "Quantity for Classic Tee, size M",
      }),
      "4"
    )

    expect(
      screen.getByText("Subtotal").nextSibling
    ).toHaveTextContent("$99.96")
    expect(lookup).toHaveBeenCalledTimes(1)
  })

  it("removes a line", async () => {
    lookup.mockResolvedValue([tee])
    fill({ size: "M", quantity: 1 })
    render(<CartView />)

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Remove Classic Tee, size M",
      })
    )

    expect(
      screen.getByText("Your cart is empty.")
    ).toBeInTheDocument()
  })

  it("keeps a sold-out line and a vanished one out of the total", async () => {
    lookup.mockResolvedValue([
      tee,
      { ...tee, size: "L", stock: 0 },
    ])
    fill(
      { size: "M", quantity: 1 },
      { size: "L", quantity: 1 },
      { size: "XL", quantity: 1 }
    )

    render(<CartView />)

    expect(
      await screen.findByText(/Sold out in this size/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/No longer available/)
    ).toBeInTheDocument()
    expect(
      screen.getByText("Subtotal").nextSibling
    ).toHaveTextContent("$24.99")
  })

  it("offers a retry when the details cannot be loaded", async () => {
    lookup.mockRejectedValueOnce(new Error("offline"))
    lookup.mockResolvedValue([tee])
    fill({ size: "M", quantity: 1 })
    render(<CartView />)

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("We could not load your cart.")
    await userEvent.click(
      screen.getByRole("button", { name: "Try again" })
    )

    expect(
      await screen.findByText("Classic Tee")
    ).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    lookup.mockResolvedValue([tee])
    fill({ size: "M", quantity: 1 })
    const { container } = render(<CartView />)
    await screen.findByText("Classic Tee")

    expect(await axe(container)).toHaveNoViolations()
  })
})
