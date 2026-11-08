import type { Metadata, Route } from "next"
import Image from "next/image"
import Link from "next/link"

import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth/session"
import { formatPrice } from "@/lib/catalog/format"
import { listOrders } from "@/lib/orders/queries"

export const metadata: Metadata = { title: "Orders" }

const date = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
})

export default async function OrdersPage() {
  const user = await requireUser("/account/orders")
  const orders = await listOrders(user.id)

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold">
          Your orders
        </h2>
        <p className="text-sm text-muted-foreground">
          Track what you bought and cancel what has not been
          confirmed.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="space-y-3">
          <p className="text-muted-foreground">
            You have not placed an order yet.
          </p>
          <Button asChild>
            <Link href="/shop">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const count = order.items.reduce(
              (sum, i) => sum + i.quantity,
              0
            )
            const image = order.items.find(
              (i) => i.imageUrl
            )?.imageUrl
            return (
              <li key={order.id}>
                <Link
                  href={
                    `/account/orders/${order.number}` as Route
                  }
                  className="flex gap-4 rounded-lg border border-border p-4 hover:bg-accent/40"
                >
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {image && (
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {order.number}
                      <OrderStatusBadge
                        status={order.status}
                      />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {date.format(order.placedAt)} ·{" "}
                      {count}{" "}
                      {count === 1 ? "item" : "items"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {order.items
                        .map((i) => i.name)
                        .join(", ")}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatPrice(order.totalCents)}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
