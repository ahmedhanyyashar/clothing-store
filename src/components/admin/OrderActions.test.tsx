import {
  render,
  screen,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { orderAction } from "@/lib/admin/actions"

import { OrderActions } from "./OrderActions"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))
vi.mock("@/lib/admin/actions", () => ({
  orderAction: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

describe("OrderActions", () => {
  it("shows a button for each thing that can be done", () => {
    render(
      <OrderActions
        number="CS-7K2M9QXD"
        actions={["ship", "cancel"]}
      />
    )

    expect(
      screen.getByRole("button", {
        name: "Mark as shipped",
      })
    ).toBeEnabled()
    expect(
      screen.getByRole("button", { name: "Cancel order" })
    ).toBeEnabled()
    expect(
      screen.queryByRole("button", {
        name: "Confirm order",
      })
    ).not.toBeInTheDocument()
  })

  it("says so when nothing can be done", () => {
    render(
      <OrderActions number="CS-7K2M9QXD" actions={[]} />
    )

    expect(
      screen.getByText(
        "Nothing more can be done to this order."
      )
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button")
    ).not.toBeInTheDocument()
  })

  it("does a step, tells the admin, and reloads the page", async () => {
    vi.mocked(orderAction).mockResolvedValue({
      ok: true,
      message: "The order is confirmed.",
    })
    render(
      <OrderActions
        number="CS-7K2M9QXD"
        actions={["confirm", "cancel"]}
      />
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Confirm order" })
    )

    expect(orderAction).toHaveBeenCalledWith(
      "CS-7K2M9QXD",
      "confirm"
    )
    expect(
      await screen.findByRole("status")
    ).toHaveTextContent("The order is confirmed.")
    expect(refresh).toHaveBeenCalled()
  })

  it("asks before cancelling, and says what happens to a payment", async () => {
    vi.mocked(orderAction).mockResolvedValue({
      ok: true,
      message: "Cancelled.",
    })
    const user = userEvent.setup()
    render(
      <OrderActions
        number="CS-7K2M9QXD"
        actions={["cancel"]}
        refundNote="The payment of $54.98 is refunded to the customer's card."
      />
    )

    await user.click(
      screen.getByRole("button", { name: "Cancel order" })
    )
    const dialog = screen.getByRole("alertdialog", {
      name: "Cancel order CS-7K2M9QXD?",
    })
    expect(dialog).toHaveTextContent("$54.98 is refunded")
    expect(orderAction).not.toHaveBeenCalled()

    await user.click(
      within(dialog).getByRole("button", {
        name: "Keep order",
      })
    )
    expect(orderAction).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole("button", { name: "Cancel order" })
    )
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole(
        "button",
        { name: "Cancel order" }
      )
    )
    expect(orderAction).toHaveBeenCalledWith(
      "CS-7K2M9QXD",
      "cancel"
    )
  })

  it("shows a failure as an alert, and still reloads", async () => {
    vi.mocked(orderAction).mockResolvedValue({
      ok: false,
      message:
        "That cannot be done to this order any more.",
    })
    render(
      <OrderActions
        number="CS-7K2M9QXD"
        actions={["ship"]}
      />
    )

    await userEvent.click(
      screen.getByRole("button", {
        name: "Mark as shipped",
      })
    )

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("cannot be done")
    expect(refresh).toHaveBeenCalled()
  })

  it("offers the refund to retry in its own words", () => {
    render(
      <OrderActions
        number="CS-7K2M9QXD"
        actions={["refund"]}
      />
    )

    expect(
      screen.getByRole("button", { name: "Retry refund" })
    ).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <OrderActions
        number="CS-7K2M9QXD"
        actions={["ship", "cancel"]}
      />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
