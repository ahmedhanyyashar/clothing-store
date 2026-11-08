import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it } from "vitest"

import { PaymentStatusBadge } from "./PaymentStatusBadge"

describe("PaymentStatusBadge", () => {
  it.each([
    ["CARD", "PENDING", "Awaiting payment"],
    ["CARD", "PAID", "Paid"],
    ["CARD", "FAILED", "Not paid"],
    ["CARD", "REFUNDED", "Refunded"],
    ["CASH_ON_DELIVERY", "PENDING", "To pay on delivery"],
  ] as const)(
    "shows %s %s as %s",
    (method, status, label) => {
      render(
        <PaymentStatusBadge
          method={method}
          status={status}
        />
      )

      expect(screen.getByText(label)).toBeInTheDocument()
    }
  )

  it("has no accessibility violations", async () => {
    const { container } = render(
      <PaymentStatusBadge method="CARD" status="PAID" />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
