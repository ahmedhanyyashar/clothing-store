import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import { toast } from "sonner"
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { useCartStore } from "@/lib/cart/store"

import { AddToCart } from "./AddToCart"

const sizes = [
  { label: "S", stock: 2 },
  { label: "M", stock: 8 },
  { label: "L", stock: 0 },
]

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
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
    expect(toast.success).toHaveBeenCalledWith(
      "Added to your cart.",
      {
        action: expect.objectContaining({
          label: "View cart",
        }),
      }
    )
    // the toast's button takes the shopper to the cart
    const options = vi.mocked(toast.success).mock
      .calls[0][1] as unknown as {
      action: { onClick: () => void }
    }
    options.action.onClick()
    expect(push).toHaveBeenCalledWith("/cart")
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

    expect(toast.warning).toHaveBeenCalledWith(
      "Your cart has the most we can offer.",
      expect.anything()
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
