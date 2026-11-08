import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { ConfirmingPayment } from "./ConfirmingPayment"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

beforeEach(() => {
  vi.useFakeTimers()
  refresh.mockClear()
})
afterEach(() => vi.useRealTimers())

describe("ConfirmingPayment", () => {
  it("tells the shopper what is happening", () => {
    render(<ConfirmingPayment />)

    expect(screen.getByRole("status")).toHaveTextContent(
      "Confirming your payment"
    )
  })

  it("asks for the page again every two seconds, and gives up after a while", () => {
    render(<ConfirmingPayment />)

    vi.advanceTimersByTime(2000)
    expect(refresh).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(4000)
    expect(refresh).toHaveBeenCalledTimes(3)

    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(refresh).toHaveBeenCalledTimes(15)
  })

  it("stops when it is removed", () => {
    const { unmount } = render(<ConfirmingPayment />)
    unmount()

    vi.advanceTimersByTime(60_000)

    expect(refresh).not.toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    vi.useRealTimers()
    const { container } = render(<ConfirmingPayment />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
