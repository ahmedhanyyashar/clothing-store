import type { Metadata, Route } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/orders/PaymentStatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OrderStatus } from "@/generated/prisma/enums"
import { listAdminOrders } from "@/lib/admin/orders"
import { requireRole } from "@/lib/auth/session"
import { formatPrice } from "@/lib/catalog/format"
import { ORDER_STATUS_INFO } from "@/lib/orders/status"

export const metadata: Metadata = { title: "Orders" }

const date = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
})

const STATUSES = Object.keys(
  ORDER_STATUS_INFO
) as OrderStatus[]

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    q?: string
    page?: string
  }>
}) {
  await requireRole("ADMIN", "/admin/orders")
  const params = await searchParams
  const status = STATUSES.find((s) => s === params.status)
  const q = params.q?.trim().slice(0, 100) || undefined
  const page = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1
  )

  const { orders, total, pageCount } =
    await listAdminOrders({ status, q, page })
  // a page past the end is as missing as any other address
  if (page > pageCount) notFound()

  // links to other pages keep the filters
  const href = (n: number) => {
    const next = new URLSearchParams()
    if (status) next.set("status", status)
    if (q) next.set("q", q)
    if (n > 1) next.set("page", String(n))
    const query = next.toString()
    return `/admin/orders${query ? `?${query}` : ""}` as Route
  }
  const filtered = Boolean(status || q)

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold">Orders</h2>
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "order" : "orders"}
          {filtered ? " match" : ""}, newest first.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3"
      >
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">
            Status
          </span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_INFO[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-56 flex-1 gap-1 text-sm">
          <span className="text-muted-foreground">
            Order number, name or email
          </span>
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
          />
        </label>
        <Button type="submit">Filter</Button>
        {filtered && (
          <Button asChild variant="ghost">
            <Link href="/admin/orders">Clear</Link>
          </Button>
        )}
      </form>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">
          {filtered
            ? "No orders match these filters."
            : "There are no orders yet."}
        </p>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableCaption className="sr-only">
              Orders
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">
                  Items
                </TableHead>
                <TableHead className="text-right">
                  Total
                </TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={
                        `/admin/orders/${order.number}` as Route
                      }
                      className="underline-offset-4 hover:underline"
                    >
                      {order.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {order.shipName}
                    {order.user && (
                      <span className="block text-xs text-muted-foreground">
                        {order.user.email}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {order.items.reduce(
                      (sum, i) => sum + i.quantity,
                      0
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(order.totalCents)}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge
                      method={order.paymentMethod}
                      status={order.paymentStatus}
                    />
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge
                      status={order.status}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {date.format(order.placedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Order pages"
          className="flex items-center gap-3 text-sm"
        >
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page - 1)}>Previous</Link>
            </Button>
          )}
          <span>
            Page {page} of {pageCount}
          </span>
          {page < pageCount && (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page + 1)}>Next</Link>
            </Button>
          )}
        </nav>
      )}
    </>
  )
}
