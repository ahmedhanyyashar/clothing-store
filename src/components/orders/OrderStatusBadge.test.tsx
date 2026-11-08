import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it } from "vitest"

import { OrderStatusBadge } from "./OrderStatusBadge"

describe("OrderStatusBadge", () => {
  it.each([
    ["PENDING", "Pending"],
    ["CONFIRMED", "Confirmed"],
    ["SHIPPED", "Shipped"],
    ["DELIVERED", "Delivered"],
    ["CANCELLED", "Cancelled"],
  ] as const)("shows %s as %s", (status, label) => {
    render(<OrderStatusBadge status={status} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <OrderStatusBadge status="PENDING" />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
