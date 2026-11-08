import type { RevenueDay } from "@/lib/admin/dashboard"
import { formatPrice } from "@/lib/catalog/format"

const label = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

// A date such as 2026-11-08 is a UTC day; reading it as UTC keeps it on that day.
const dayLabel = (date: string) =>
  label.format(new Date(`${date}T00:00:00Z`))

/**
 * Revenue per day as bars. The bars are for the eye; the table beside them is
 * what a screen reader gets, with every value, so nothing depends on seeing
 * the chart.
 */
export function RevenueChart({
  days,
}: {
  days: RevenueDay[]
}) {
  const max = Math.max(...days.map((day) => day.cents), 0)
  const total = days.reduce(
    (sum, day) => sum + day.cents,
    0
  )

  return (
    <figure>
      <figcaption className="text-sm font-semibold">
        Revenue, last {days.length} days:{" "}
        {formatPrice(total)}
      </figcaption>
      <div
        role="img"
        aria-label={`Bar chart of revenue per day for the last ${days.length} days, ${formatPrice(total)} in total. The same numbers are in the table below.`}
        className="mt-3 flex h-40 items-end gap-1"
      >
        {days.map((day) => (
          <div
            key={day.date}
            title={`${dayLabel(day.date)}: ${formatPrice(day.cents)}`}
            className="flex-1 rounded-t bg-primary"
            style={{
              // a day with money always shows, even next to a much bigger one
              height:
                day.cents === 0
                  ? "2px"
                  : `${Math.max(4, (day.cents / max) * 100)}%`,
              opacity: day.cents === 0 ? 0.25 : 1,
            }}
          />
        ))}
      </div>
      <table className="sr-only">
        <caption>Revenue per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{dayLabel(day.date)}</th>
              <td>{formatPrice(day.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
