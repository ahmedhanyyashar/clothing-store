import type { Metadata, Route } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { DataTable } from "@/components/admin/DataTable"
import { Pagination } from "@/components/admin/Pagination"
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/orders/PaymentStatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { OrderStatus } from "@/generated/prisma/enums"
import {
  DEFAULT_ORDER_SORT,
  listAdminOrders,
  ORDER_SORTS,
} from "@/lib/admin/orders"
import { parseSort } from "@/lib/admin/sorting"
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
    sort?: string
    dir?: string
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
  const sort = parseSort(
    params,
    ORDER_SORTS,
    DEFAULT_ORDER_SORT
  )

  const { orders, total, pageCount } =
    await listAdminOrders({ status, q, page, sort })
  // a page past the end is as missing as any other address
  if (page > pageCount) notFound()

  // links keep the filters and the sort; a new sort starts again at page 1
  const href = (
    n: number,
    order: { key: string; dir: string } = sort
  ) => {
    const next = new URLSearchParams()
    if (status) next.set("status", status)
    if (q) next.set("q", q)
    if (
      order.key !== DEFAULT_ORDER_SORT.key ||
      order.dir !== DEFAULT_ORDER_SORT.dir
    ) {
      next.set("sort", order.key)
      next.set("dir", order.dir)
    }
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
          {filtered ? " match" : ""}. Choose a heading to
          sort.
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
        {/* filtering keeps the sort */}
        <input type="hidden" name="sort" value={sort.key} />
        <input type="hidden" name="dir" value={sort.dir} />
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
        <DataTable
          caption="Orders"
          rows={orders}
          rowKey={(order) => order.id}
          sort={sort}
          sortHref={(key, dir) => href(1, { key, dir })}
          columns={[
            {
              id: "number",
              header: "Order",
              sortKey: "number",
              className: "font-medium",
              cell: (order) => (
                <Link
                  href={
                    `/admin/orders/${order.number}` as Route
                  }
                  className="underline-offset-4 hover:underline"
                >
                  {order.number}
                </Link>
              ),
            },
            {
              id: "customer",
              header: "Customer",
              sortKey: "customer",
              cell: (order) => (
                <>
                  {order.shipName}
                  {order.user && (
                    <span className="block text-xs text-muted-foreground">
                      {order.user.email}
                    </span>
                  )}
                </>
              ),
            },
            {
              id: "items",
              header: "Items",
              align: "right",
              cell: (order) =>
                order.items.reduce(
                  (sum, i) => sum + i.quantity,
                  0
                ),
            },
            {
              id: "total",
              header: "Total",
              sortKey: "total",
              align: "right",
              cell: (order) =>
                formatPrice(order.totalCents),
            },
            {
              id: "payment",
              header: "Payment",
              cell: (order) => (
                <PaymentStatusBadge
                  method={order.paymentMethod}
                  status={order.paymentStatus}
                />
              ),
            },
            {
              id: "status",
              header: "Status",
              sortKey: "status",
              cell: (order) => (
                <OrderStatusBadge status={order.status} />
              ),
            },
            {
              id: "placed",
              header: "Placed",
              sortKey: "placed",
              className: "whitespace-nowrap",
              cell: (order) => date.format(order.placedAt),
            },
          ]}
        />
      )}

      <Pagination
        label="Order pages"
        page={page}
        pageCount={pageCount}
        href={(n) => href(n)}
      />
    </>
  )
}
