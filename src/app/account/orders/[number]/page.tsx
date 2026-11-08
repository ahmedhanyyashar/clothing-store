import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CancelOrder } from "@/components/orders/CancelOrder"
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge"
import { addressLines } from "@/lib/address/validations"
import { requireUser } from "@/lib/auth/session"
import { formatPrice } from "@/lib/catalog/format"
import { ORDER_NUMBER_PATTERN } from "@/lib/orders/number"
import { getOrder } from "@/lib/orders/queries"
import {
  canCustomerCancel,
  ORDER_STATUS_INFO,
} from "@/lib/orders/status"

export const metadata: Metadata = { title: "Order" }

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
})

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>
  searchParams: Promise<{ placed?: string }>
}) {
  const { number } = await params
  const user = await requireUser(
    `/account/orders/${number}`
  )
  // a number that cannot exist needs no lookup
  if (!ORDER_NUMBER_PATTERN.test(number)) notFound()

  // someone else's order is indistinguishable from one that does not exist
  const order = await getOrder(user.id, number)
  if (!order) notFound()
  const { placed } = await searchParams

  return (
    <>
      {placed === "1" && (
        <div
          role="status"
          className="rounded-lg border border-border bg-accent p-4"
        >
          <p className="font-semibold">
            Thank you, your order is placed.
          </p>
          <p className="text-sm">
            We sent a confirmation to your email. You pay in
            cash when it arrives.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm">
          <Link
            href="/account/orders"
            className="underline"
          >
            All orders
          </Link>
        </p>
        <h2 className="flex flex-wrap items-center gap-3 text-xl font-semibold">
          Order {order.number}
          <OrderStatusBadge status={order.status} />
        </h2>
        <p className="text-sm text-muted-foreground">
          Placed {dateTime.format(order.placedAt)}.{" "}
          {ORDER_STATUS_INFO[order.status].description}
        </p>
      </div>

      <section aria-labelledby="items-heading">
        <h3 id="items-heading" className="font-semibold">
          Items
        </h3>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 p-4">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">
                  {item.productId ? (
                    <Link
                      href={`/products/${item.productId}`}
                      className="hover:underline"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                </p>
                <p className="text-muted-foreground">
                  Size {item.size} · Qty {item.quantity} ·{" "}
                  {formatPrice(item.unitPriceCents)} each
                </p>
              </div>
              <p className="text-sm font-medium">
                {formatPrice(
                  item.unitPriceCents * item.quantity
                )}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Subtotal
            </dt>
            <dd>{formatPrice(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Shipping
            </dt>
            <dd>
              {order.shippingCents === 0
                ? "Free"
                : formatPrice(order.shippingCents)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatPrice(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="delivery-heading"
        className="grid gap-6 sm:grid-cols-2"
      >
        <div>
          <h3
            id="delivery-heading"
            className="font-semibold"
          >
            Delivery address
          </h3>
          <address className="mt-2 text-sm not-italic">
            {addressLines({
              fullName: order.shipName,
              line1: order.shipLine1,
              line2: order.shipLine2,
              city: order.shipCity,
              region: order.shipRegion,
              postalCode: order.shipPostalCode,
              country: order.shipCountry,
            }).map((line) => (
              <div key={line}>{line}</div>
            ))}
            {order.shipPhone && (
              <div>{order.shipPhone}</div>
            )}
          </address>
          {order.shipNotes && (
            <p className="mt-2 text-sm text-muted-foreground">
              Note: {order.shipNotes}
            </p>
          )}
        </div>
        <div>
          <h3 className="font-semibold">Payment</h3>
          <p className="mt-2 text-sm">Cash on delivery</p>
        </div>
      </section>

      {canCustomerCancel(order.status) && (
        <CancelOrder number={order.number} />
      )}
    </>
  )
}
