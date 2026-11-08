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

import { resumePaymentAction } from "@/lib/payments/actions"

import { PayNow } from "./PayNow"

vi.mock("@/lib/payments/actions", () => ({
  resumePaymentAction: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

describe("PayNow", () => {
  it("takes the shopper to the payment page", async () => {
    const assign = vi.fn()
    vi.stubGlobal("location", {
      ...window.location,
      assign,
    })
    vi.mocked(resumePaymentAction).mockResolvedValue({
      ok: true,
      url: "https://checkout.stripe.com/pay/cs_test_1",
    })
    render(<PayNow number="CS-7K2M9QXD" />)

    await userEvent.click(
      screen.getByRole("button", { name: "Pay now" })
    )

    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "https://checkout.stripe.com/pay/cs_test_1"
      )
    )
    expect(resumePaymentAction).toHaveBeenCalledWith(
      "CS-7K2M9QXD"
    )
    vi.unstubAllGlobals()
  })

  it("shows why it could not, and can be tried again", async () => {
    vi.mocked(resumePaymentAction).mockResolvedValue({
      ok: false,
      message: "This order can no longer be paid.",
    })
    render(<PayNow number="CS-7K2M9QXD" />)

    await userEvent.click(
      screen.getByRole("button", { name: "Pay now" })
    )

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("can no longer be paid")
    expect(
      screen.getByRole("button", { name: "Pay now" })
    ).toBeEnabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <PayNow number="CS-7K2M9QXD" />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
