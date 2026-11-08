import type { Metadata, Route } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { OrderActions } from "@/components/admin/OrderActions"
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge"
import { PaymentStatusBadge } from "@/components/orders/PaymentStatusBadge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { addressLines } from "@/lib/address/validations"
import { availableActions } from "@/lib/admin/order-rules"
import { getAdminOrder } from "@/lib/admin/orders"
import { requireRole } from "@/lib/auth/session"
import { formatPrice } from "@/lib/catalog/format"
import { ORDER_NUMBER_PATTERN } from "@/lib/orders/number"
import { ORDER_STATUS_INFO } from "@/lib/orders/status"
import { PAYMENT_METHOD_LABEL } from "@/lib/payments/status"

export const metadata: Metadata = { title: "Order" }

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
})

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const { number } = await params
  await requireRole("ADMIN", `/admin/orders/${number}`)
  if (!ORDER_NUMBER_PATTERN.test(number)) notFound()

  const order = await getAdminOrder(number)
  if (!order) notFound()

  const actions = availableActions(order)
  const paidByCard =
    order.paymentMethod === "CARD" &&
    order.paymentStatus === "PAID"

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm">
          <Link
            href={"/admin/orders" as Route}
            className="underline"
          >
            All orders
          </Link>
        </p>
        <h2 className="flex flex-wrap items-center gap-3 text-xl font-semibold">
          Order {order.number}
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge
            method={order.paymentMethod}
            status={order.paymentStatus}
          />
        </h2>
        <p className="text-sm text-muted-foreground">
          Placed {dateTime.format(order.placedAt)} UTC.{" "}
          {ORDER_STATUS_INFO[order.status].description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h3>What to do</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.status === "CANCELLED" &&
            order.paymentStatus === "PAID" && (
              <p className="mb-3 text-sm text-destructive">
                This order is cancelled but its payment has
                not been refunded yet.
              </p>
            )}
          <OrderActions
            number={order.number}
            actions={actions}
            refundNote={
              paidByCard
                ? `The payment of ${formatPrice(order.totalCents)} is refunded to the customer's card.`
                : undefined
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h3>Customer</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {order.user ? (
              <>
                <p>{order.user.name}</p>
                <p className="text-muted-foreground">
                  {order.user.email}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                The account was deleted.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h3>Delivery</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <address className="not-italic">
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
              <p className="mt-2 text-muted-foreground">
                Note: {order.shipNotes}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Items</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-3">
                <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">
                    Size {item.size} · Qty {item.quantity} ·{" "}
                    {formatPrice(item.unitPriceCents)} each
                  </p>
                </div>
                <p className="font-medium">
                  {formatPrice(
                    item.unitPriceCents * item.quantity
                  )}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
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
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatPrice(order.totalCents)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Payment</h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
          {order.paidAt && (
            <p className="text-muted-foreground">
              Paid {dateTime.format(order.paidAt)} UTC
            </p>
          )}
          {order.refundedAt && (
            <p className="text-muted-foreground">
              Refunded {dateTime.format(order.refundedAt)}{" "}
              UTC
            </p>
          )}
          {order.stripePaymentIntentId && (
            <p className="text-muted-foreground">
              Stripe payment {order.stripePaymentIntentId}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h3>History</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No admin has changed this order.
            </p>
          ) : (
            <ol className="divide-y divide-border text-sm">
              {order.history.map((entry) => (
                <li key={entry.id} className="py-2">
                  <p>{entry.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateTime.format(entry.createdAt)} UTC ·{" "}
                    {entry.actorLabel}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  )
}
