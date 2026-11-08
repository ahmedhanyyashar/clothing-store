import {
  render,
  screen,
  within,
} from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it } from "vitest"

import type { RevenueDay } from "@/lib/admin/dashboard"

import { RevenueChart } from "./RevenueChart"

const days: RevenueDay[] = [
  { date: "2026-11-06", cents: 0 },
  { date: "2026-11-07", cents: 2500 },
  { date: "2026-11-08", cents: 10000 },
]

describe("RevenueChart", () => {
  it("gives the total in its caption and its description", () => {
    render(<RevenueChart days={days} />)

    expect(
      screen.getByText(/Revenue, last 3 days: \$125\.00/)
    ).toBeInTheDocument()
    expect(screen.getByRole("img")).toHaveAccessibleName(
      /\$125\.00 in total/
    )
  })

  it("gives a screen reader every value in a table", () => {
    render(<RevenueChart days={days} />)

    const table = screen.getByRole("table", {
      name: "Revenue per day",
    })
    const rows = within(table).getAllByRole("row")
    expect(rows).toHaveLength(4)
    expect(
      within(table).getByRole("row", {
        name: /Nov 7.*\$25\.00/,
      })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole("row", {
        name: /Nov 8.*\$100\.00/,
      })
    ).toBeInTheDocument()
  })

  it("draws the biggest day full height and the others in proportion", () => {
    const { container } = render(
      <RevenueChart days={days} />
    )

    const bars =
      container.querySelectorAll<HTMLElement>("[title]")
    expect(bars[2].style.height).toBe("100%")
    expect(bars[1].style.height).toBe("25%")
    // a day with no money is a thin, faint line, not nothing
    expect(bars[0].style.height).toBe("2px")
  })

  it("does not break when there is no revenue at all", () => {
    const { container } = render(
      <RevenueChart
        days={days.map((d) => ({ ...d, cents: 0 }))}
      />
    )

    expect(
      screen.getByText(/Revenue, last 3 days: \$0\.00/)
    ).toBeInTheDocument()
    expect(
      container.querySelectorAll("[title]")
    ).toHaveLength(3)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <RevenueChart days={days} />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
