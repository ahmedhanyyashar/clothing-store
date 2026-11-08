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

import type { SavedAddress } from "@/lib/address/queries"
import { loadCartProducts } from "@/lib/cart/actions"
import type { CartProduct } from "@/lib/cart/model"
import { useCartStore } from "@/lib/cart/store"
import { placeOrderAction } from "@/lib/orders/actions"

import { CheckoutView } from "./CheckoutView"

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))
vi.mock("@/lib/cart/actions", () => ({
  loadCartProducts: vi.fn(),
}))
vi.mock("@/lib/orders/actions", () => ({
  placeOrderAction: vi.fn(),
}))

const lookup = vi.mocked(loadCartProducts)
const place = vi.mocked(placeOrderAction)

const tee: CartProduct = {
  productId: "tee",
  size: "M",
  name: "Classic Tee",
  priceCents: 2000,
  imageUrl: "/products/tee.webp",
  stock: 5,
}

const address = (
  over: Partial<SavedAddress>
): SavedAddress => ({
  id: "home",
  label: "Home",
  fullName: "Ada Lovelace",
  phone: "+12025550123",
  line1: "1 Main St",
  line2: null,
  city: "Austin",
  region: "Texas",
  postalCode: "73301",
  country: "US",
  notes: null,
  isDefault: true,
  createdAt: new Date(),
  ...over,
})

const home = address({})
const work = address({
  id: "work",
  label: "Work",
  line1: "9 Office Rd",
  isDefault: false,
})

function fill(
  ...lines: { size: string; quantity: number }[]
) {
  useCartStore.setState({
    userId: "u1",
    lines: lines.map((l) => ({ productId: "tee", ...l })),
  })
}

const placeButton = () =>
  screen.getByRole("button", {
    name: /Place order|Pay by card|Placing order/,
  })

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  useCartStore.setState({ userId: "u1", lines: [] })
})

describe("CheckoutView", () => {
  it("says so when the cart is empty", async () => {
    render(<CheckoutView addresses={[home]} />)

    expect(
      await screen.findByText("Your cart is empty.")
    ).toBeInTheDocument()
  })

  it("shows the items, the default address and the totals with shipping", async () => {
    lookup.mockResolvedValue([tee])
    fill({ size: "M", quantity: 2 })

    render(<CheckoutView addresses={[home, work]} />)

    expect(
      await screen.findByText("Classic Tee")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("radio", { name: /Home/ })
    ).toBeChecked()
    expect(
      screen.getByText("Cash on delivery")
    ).toBeInTheDocument()
    // $40.00 is below the free-shipping line, so $5.00 is added
    expect(
      screen.getByText("Subtotal").nextSibling
    ).toHaveTextContent("$40.00")
    expect(
      screen.getByText("Shipping").nextSibling
    ).toHaveTextContent("$5.00")
    expect(
      screen.getByText("Total").nextSibling
    ).toHaveTextContent("$45.00")
  })

  it("does not charge shipping once the order is large enough", async () => {
    lookup.mockResolvedValue([{ ...tee, priceCents: 4000 }])
    fill({ size: "M", quantity: 2 })

    render(<CheckoutView addresses={[home]} />)

    await screen.findByText("Classic Tee")
    expect(
      screen.getByText("Shipping").nextSibling
    ).toHaveTextContent("Free")
    expect(
      screen.getByText("Total").nextSibling
    ).toHaveTextContent("$80.00")
  })

  it("places a cash order with the chosen address, empties the cart and opens the order", async () => {
    lookup.mockResolvedValue([tee])
    place.mockResolvedValue({
      ok: true,
      number: "CS-7K2M9QXD",
    })
    fill({ size: "M", quantity: 2 })
    const user = userEvent.setup()
    render(<CheckoutView addresses={[home, work]} />)
    await screen.findByText("Classic Tee")

    await user.click(
      screen.getByRole("radio", { name: /Work/ })
    )
    await user.click(
      screen.getByRole("radio", {
        name: /Cash on delivery/,
      })
    )
    await user.click(placeButton())

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/account/orders/CS-7K2M9QXD?placed=1"
      )
    )
    expect(place).toHaveBeenCalledWith({
      addressId: "work",
      idempotencyKey:
        expect.stringMatching(/^[0-9a-f-]{36}$/),
      paymentMethod: "CASH_ON_DELIVERY",
      items: [{ productId: "tee", size: "M", quantity: 2 }],
    })
    expect(useCartStore.getState().lines).toEqual([])
  })

  it("pays by card by default, and goes to Stripe's page with the order made", async () => {
    const assign = vi.fn()
    vi.stubGlobal("location", {
      ...window.location,
      assign,
    })
    lookup.mockResolvedValue([tee])
    place.mockResolvedValue({
      ok: true,
      number: "CS-7K2M9QXD",
      redirectUrl:
        "https://checkout.stripe.com/pay/cs_test_1",
    })
    fill({ size: "M", quantity: 1 })
    const user = userEvent.setup()
    render(<CheckoutView addresses={[home]} />)
    await screen.findByText("Classic Tee")

    expect(
      screen.getByRole("radio", { name: /Pay by card/ })
    ).toBeChecked()
    await user.click(placeButton())

    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "https://checkout.stripe.com/pay/cs_test_1"
      )
    )
    expect(place).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: "CARD" })
    )
    expect(push).not.toHaveBeenCalled()
    // the order exists and holds the items, so the cart is empty
    expect(useCartStore.getState().lines).toEqual([])
    vi.unstubAllGlobals()
  })

  it("keeps the cart and says so when the payment page could not be opened", async () => {
    lookup.mockResolvedValue([tee])
    place.mockResolvedValue({
      ok: false,
      message:
        "We could not start the payment. Nothing was charged and your items were released. Please try again.",
    })
    fill({ size: "M", quantity: 1 })
    const user = userEvent.setup()
    render(<CheckoutView addresses={[home]} />)
    await screen.findByText("Classic Tee")

    await user.click(placeButton())

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Nothing was charged")
    expect(useCartStore.getState().lines).toHaveLength(1)
    expect(placeButton()).toBeEnabled()
  })

  it("labels the button after how the shopper pays", async () => {
    lookup.mockResolvedValue([tee])
    fill({ size: "M", quantity: 1 })
    const user = userEvent.setup()
    render(<CheckoutView addresses={[home]} />)
    await screen.findByText("Classic Tee")

    expect(placeButton()).toHaveTextContent("Pay by card")
    await user.click(
      screen.getByRole("radio", {
        name: /Cash on delivery/,
      })
    )
    expect(placeButton()).toHaveTextContent("Place order")
  })

  it("sends a line that is cut to the stock at the quantity that is shown", async () => {
    lookup.mockResolvedValue([{ ...tee, stock: 2 }])
    place.mockResolvedValue({
      ok: true,
      number: "CS-7K2M9QXD",
    })
    fill({ size: "M", quantity: 5 })
    const user = userEvent.setup()
    render(<CheckoutView addresses={[home]} />)

    expect(
      await screen.findByText("Only 2 left in this size.")
    ).toBeInTheDocument()
    await user.click(placeButton())

    await vi.waitFor(() => expect(place).toHaveBeenCalled())
    expect(place).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          { productId: "tee", size: "M", quantity: 2 },
        ],
      })
    )
  })

  it("sends a double click once", async () => {
    lookup.mockResolvedValue([tee])
    place.mockReturnValue(new Promise(() => {}))
    fill({ size: "M", quantity: 1 })
    const user = userEvent.setup()
    render(<CheckoutView addresses={[home]} />)
    await screen.findByText("Classic Tee")

    await user.dblClick(placeButton())

    expect(place).toHaveBeenCalledTimes(1)
    expect(placeButton()).toBeDisabled()
  })

  it("keeps the cart and says what is wrong when a line cannot be bought", async () => {
    lookup.mockResolvedValue([tee])
    place.mockResolvedValue({
      ok: false,
      problems: [
        {
          productId: "tee",
          size: "M",
          code: "insufficient",
          available: 1,
        },
      ],
    })
    fill({ size: "M", quantity: 2 })
    const user = userEvent.setup()
    render(<CheckoutView addresses={[home]} />)
    await screen.findByText("Classic Tee")

    await user.click(placeButton())

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Classic Tee (size M): only 1 left")
    expect(push).not.toHaveBeenCalled()
    expect(useCartStore.getState().lines).toHaveLength(1)
    // the details are fetched again, so the lines show what is left
    await vi.waitFor(() =>
      expect(lookup).toHaveBeenCalledTimes(2)
    )
  })

  it("can try again after a failure with the same attempt key", async () => {
    lookup.mockResolvedValue([tee])
    place.mockResolvedValueOnce({
      ok: false,
      message: "Try later",
    })
    place.mockResolvedValue({
      ok: true,
      number: "CS-7K2M9QXD",
    })
    fill({ size: "M", quantity: 1 })
    const user = userEvent.setup()
    render(<CheckoutView addresses={[home]} />)
    await screen.findByText("Classic Tee")

    await user.click(placeButton())
    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Try later")
    await user.click(placeButton())

    await vi.waitFor(() => expect(push).toHaveBeenCalled())
    const keys = place.mock.calls.map(
      (call) =>
        (call[0] as { idempotencyKey: string })
          .idempotencyKey
    )
    expect(keys[0]).toBe(keys[1])
  })

  it("cannot place an order while an item cannot be bought", async () => {
    lookup.mockResolvedValue([
      tee,
      { ...tee, size: "L", stock: 0 },
    ])
    fill(
      { size: "M", quantity: 1 },
      { size: "L", quantity: 1 }
    )

    render(<CheckoutView addresses={[home]} />)

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(
      "Some items in your cart cannot be bought."
    )
    expect(placeButton()).toBeDisabled()
  })

  it("asks for an address first, and links to adding one that brings the shopper back", async () => {
    lookup.mockResolvedValue([tee])
    fill({ size: "M", quantity: 1 })

    render(<CheckoutView addresses={[]} />)

    await screen.findByText("Classic Tee")
    expect(
      screen.getByRole("link", { name: "Add an address" })
    ).toHaveAttribute(
      "href",
      "/account/addresses/new?next=/checkout"
    )
    expect(placeButton()).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    lookup.mockResolvedValue([tee])
    fill({ size: "M", quantity: 1 })
    const { container } = render(
      <CheckoutView addresses={[home, work]} />
    )
    await screen.findByText("Classic Tee")

    expect(await axe(container)).toHaveNoViolations()
  })
})
