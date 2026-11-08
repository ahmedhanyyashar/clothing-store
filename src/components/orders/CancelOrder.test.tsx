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

import { cancelOrderAction } from "@/lib/orders/actions"

import { CancelOrder } from "./CancelOrder"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))
vi.mock("@/lib/orders/actions", () => ({
  cancelOrderAction: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

describe("CancelOrder", () => {
  it("asks first, and cancels only when confirmed", async () => {
    vi.mocked(cancelOrderAction).mockResolvedValue(
      "cancelled"
    )
    const user = userEvent.setup()
    render(<CancelOrder number="CS-7K2M9QXD" />)

    await user.click(
      screen.getByRole("button", { name: "Cancel order" })
    )
    expect(cancelOrderAction).not.toHaveBeenCalled()
    await user.click(
      screen.getByRole("button", { name: "Keep order" })
    )
    expect(cancelOrderAction).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole("button", { name: "Cancel order" })
    )
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole(
        "button",
        {
          name: "Cancel order",
        }
      )
    )

    expect(cancelOrderAction).toHaveBeenCalledWith(
      "CS-7K2M9QXD"
    )
    expect(refresh).toHaveBeenCalled()
  })

  it("says so when the order can no longer be cancelled", async () => {
    vi.mocked(cancelOrderAction).mockResolvedValue(
      "not-cancellable"
    )
    const user = userEvent.setup()
    render(<CancelOrder number="CS-7K2M9QXD" />)

    await user.click(
      screen.getByRole("button", { name: "Cancel order" })
    )
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole(
        "button",
        {
          name: "Cancel order",
        }
      )
    )

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("can no longer be cancelled")
    expect(refresh).toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <CancelOrder number="CS-7K2M9QXD" />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
