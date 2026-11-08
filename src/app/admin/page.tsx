import type { Metadata } from "next"

import { RevenueChart } from "@/components/admin/RevenueChart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getDashboard,
  LOW_STOCK_AT,
} from "@/lib/admin/dashboard"
import { requireRole } from "@/lib/auth/session"
import { formatPrice } from "@/lib/catalog/format"

export const metadata: Metadata = { title: "Admin" }

export default async function DashboardPage() {
  await requireRole("ADMIN", "/admin")
  const dashboard = await getDashboard()

  const stats = [
    {
      label: "Revenue, last 30 days",
      value: formatPrice(dashboard.revenueCents),
    },
    {
      label: "Revenue, all time",
      value: formatPrice(dashboard.allTimeRevenueCents),
    },
    {
      label: "Orders waiting",
      value: String(dashboard.waiting),
    },
    {
      label: "Customers",
      value: String(dashboard.customers),
    },
    {
      label: "Products",
      value: String(dashboard.products),
    },
  ]

  return (
    <>
      <h2 className="sr-only">Dashboard</h2>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((stat) => (
          // the card is the group of the list: its term and detail sit directly in it
          <Card
            key={stat.label}
            className="gap-1 px-5 py-4"
          >
            <dt className="text-sm text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="text-2xl font-semibold">
              {stat.value}
            </dd>
          </Card>
        ))}
      </dl>

      <Card>
        <CardContent>
          <RevenueChart days={dashboard.days} />
          <p className="mt-3 text-xs text-muted-foreground">
            Money counts on the day it was paid, in UTC.
            Cash on delivery counts once the order is
            delivered; refunded orders do not count.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h3>Best sellers, last 30 days</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.bestSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing has been ordered in this period.
              </p>
            ) : (
              <ol className="divide-y divide-border text-sm">
                {dashboard.bestSellers.map((item) => (
                  <li
                    key={item.name}
                    className="flex justify-between py-2"
                  >
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.units}{" "}
                      {item.units === 1 ? "unit" : "units"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h3>Running low</h3>
            </CardTitle>
            <CardDescription>
              {LOW_STOCK_AT} left or fewer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Every size has more than {LOW_STOCK_AT} in
                stock.
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {dashboard.lowStock.map((size) => (
                  <li
                    key={size.id}
                    className="flex justify-between py-2"
                  >
                    <span>
                      {size.product.name} · size{" "}
                      {size.label}
                    </span>
                    <span
                      className={
                        size.stock === 0
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {size.stock === 0
                        ? "Sold out"
                        : `${size.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
