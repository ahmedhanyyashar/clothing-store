"use client"

import type { Route } from "next"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { EmptyState } from "@/components/catalog/EmptyState"
import { Button } from "@/components/ui/button"
import type { SavedAddress } from "@/lib/address/queries"
import { addressLines } from "@/lib/address/validations"
import { useCartStore } from "@/lib/cart/store"
import { useCart } from "@/lib/cart/use-cart"
import { formatPrice } from "@/lib/catalog/format"
import { placeOrderAction } from "@/lib/orders/actions"
import type { LineProblem } from "@/lib/orders/place"
import {
  computeTotals,
  FREE_SHIPPING_FROM_CENTS,
} from "@/lib/orders/pricing"

type PaymentMethod = "CARD" | "CASH_ON_DELIVERY"

const PAYMENT_OPTIONS: {
  value: PaymentMethod
  label: string
  description: string
}[] = [
  {
    value: "CARD",
    label: "Pay by card",
    description:
      "You pay securely on Stripe's page. Visa, Mastercard and more.",
  },
  {
    value: "CASH_ON_DELIVERY",
    label: "Cash on delivery",
    description: "Pay when your order arrives.",
  },
]

const NEW_ADDRESS =
  "/account/addresses/new?next=/checkout" as Route

/** Review the cart, choose where it goes, and place the order (cash on delivery). */
export function CheckoutView({
  addresses,
}: {
  addresses: SavedAddress[]
}) {
  const router = useRouter()
  const cart = useCart()
  const [addressId, setAddressId] = useState(
    () =>
      addresses.find((a) => a.isDefault)?.id ??
      addresses[0]?.id
  )
  // One value per checkout screen: if the request is sent twice (a double
  // click, a retry after a dropped connection) the server returns one order.
  const [idempotencyKey] = useState(() =>
    crypto.randomUUID()
  )
  const [submitting, setSubmitting] = useState(false)
  const [placed, setPlaced] = useState<string>()
  const [method, setMethod] =
    useState<PaymentMethod>("CARD")
  const [error, setError] = useState<string>()
  const [problems, setProblems] = useState<LineProblem[]>(
    []
  )

  if (!cart.ready) return <Skeleton />

  if (placed) {
    return (
      <p role="status" className="mt-8">
        {method === "CARD"
          ? `Order ${placed} created. Taking you to the payment page…`
          : `Order ${placed} placed. Taking you to it…`}
      </p>
    )
  }

  if (cart.rows.length === 0) {
    return (
      <EmptyState
        message="Your cart is empty."
        action={
          <Button asChild>
            <Link href="/shop">Continue shopping</Link>
          </Button>
        }
      />
    )
  }

  const buying = cart.rows.filter(
    (row) => row.status === "ok" || row.status === "limited"
  )
  const blocked = cart.rows.filter(
    (row) =>
      row.status === "sold-out" || row.status === "missing"
  )
  const loading = cart.rows.some(
    (row) => row.status === "loading"
  )
  const totals = computeTotals(cart.subtotalCents)
  const canPlace =
    !submitting &&
    !loading &&
    !cart.failed &&
    blocked.length === 0 &&
    buying.length > 0 &&
    addressId !== undefined

  async function place() {
    if (!canPlace || addressId === undefined) return
    setSubmitting(true)
    setError(undefined)
    setProblems([])

    const result = await placeOrderAction({
      addressId,
      idempotencyKey,
      paymentMethod: method,
      // what the customer sees is what is ordered: a line cut to the stock
      // goes in at the lower quantity
      items: buying.map((row) => ({
        productId: row.line.productId,
        size: row.line.size,
        quantity: row.quantity,
      })),
    })

    if (result.ok) {
      setPlaced(result.number)
      // the cart is emptied only once the order exists
      useCartStore.getState().clear()
      if (result.redirectUrl) {
        // pay on Stripe's page; the order page is where they come back to
        window.location.assign(result.redirectUrl)
      } else {
        router.push(
          `/account/orders/${result.number}${method === "CASH_ON_DELIVERY" ? "?placed=1" : ""}` as Route
        )
      }
      return
    }

    setSubmitting(false)
    if (result.problems) {
      setProblems(result.problems)
      // fetch the details again, so the lines show what is left now
      cart.retry()
    } else {
      setError(
        result.message ?? "Something went wrong. Try again."
      )
    }
  }

  const nameOf = (problem: LineProblem) =>
    cart.rows.find(
      (row) =>
        row.line.productId === problem.productId &&
        row.line.size === problem.size
    )?.product?.name ?? "An item"

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <section aria-labelledby="address-heading">
          <h2
            id="address-heading"
            className="text-lg font-semibold"
          >
            Delivery address
          </h2>
          {addresses.length === 0 ? (
            <div className="mt-3 space-y-3">
              <p className="text-muted-foreground">
                You have no saved address yet.
              </p>
              <Button asChild>
                <Link href={NEW_ADDRESS}>
                  Add an address
                </Link>
              </Button>
            </div>
          ) : (
            <fieldset className="mt-3 space-y-3">
              <legend className="sr-only">
                Choose an address
              </legend>
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className="flex cursor-pointer gap-3 rounded-lg border border-border p-4 has-checked:border-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={addressId === address.id}
                    onChange={() =>
                      setAddressId(address.id)
                    }
                    className="mt-1"
                  />
                  <span className="text-sm">
                    <span className="block font-medium">
                      {address.label ?? address.line1}
                      {address.isDefault && " (default)"}
                    </span>
                    {addressLines(address).map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                    <span className="block text-muted-foreground">
                      {address.phone}
                    </span>
                  </span>
                </label>
              ))}
              <Button
                asChild
                variant="link"
                className="px-0"
              >
                <Link href={NEW_ADDRESS}>
                  Add another address
                </Link>
              </Button>
            </fieldset>
          )}
        </section>

        <section aria-labelledby="payment-heading">
          <h2
            id="payment-heading"
            className="text-lg font-semibold"
          >
            Payment
          </h2>
          <fieldset className="mt-3 space-y-3">
            <legend className="sr-only">
              Choose how to pay
            </legend>
            {PAYMENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer gap-3 rounded-lg border border-border p-4 has-checked:border-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input
                  type="radio"
                  name="payment"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                  className="mt-1"
                />
                <span className="text-sm">
                  <span className="block font-medium">
                    {option.label}
                  </span>
                  <span className="text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        <section aria-labelledby="items-heading">
          <h2
            id="items-heading"
            className="text-lg font-semibold"
          >
            Items
          </h2>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {buying.map((row) => (
              <li key={row.key} className="flex gap-4 p-4">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {row.product?.imageUrl && (
                    <Image
                      src={row.product.imageUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">
                    {row.product?.name}
                  </p>
                  <p className="text-muted-foreground">
                    Size {row.line.size} · Qty{" "}
                    {row.quantity}
                  </p>
                  {row.status === "limited" && (
                    <p className="text-muted-foreground">
                      Only {row.quantity} left in this size.
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {formatPrice(row.totalCents)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside
        aria-labelledby="summary-heading"
        className="h-fit rounded-lg border border-border p-6"
      >
        <h2
          id="summary-heading"
          className="text-lg font-semibold"
        >
          Order summary
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Items</dt>
            <dd>{cart.itemCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Subtotal
            </dt>
            <dd>{formatPrice(totals.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Shipping
            </dt>
            <dd>
              {totals.shippingCents === 0
                ? "Free"
                : formatPrice(totals.shippingCents)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatPrice(totals.totalCents)}</dd>
          </div>
        </dl>
        {totals.shippingCents > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Free shipping from{" "}
            {formatPrice(FREE_SHIPPING_FROM_CENTS)}. Prices
            include tax.
          </p>
        )}

        {blocked.length > 0 && (
          <p
            role="alert"
            className="mt-4 text-sm text-destructive"
          >
            Some items in your cart cannot be bought.{" "}
            <Link href="/cart" className="underline">
              Review your cart
            </Link>
            .
          </p>
        )}
        {problems.length > 0 && (
          <div
            role="alert"
            className="mt-4 space-y-1 text-sm text-destructive"
          >
            <p>
              Your order was not placed, and nothing was
              charged:
            </p>
            <ul className="list-disc pl-5">
              {problems.map((problem) => (
                <li
                  key={`${problem.productId}|${problem.size}`}
                >
                  {nameOf(problem)} (size {problem.size}):{" "}
                  {problem.code === "insufficient"
                    ? `only ${problem.available} left`
                    : "no longer available"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {cart.failed && (
          <p
            role="alert"
            className="mt-4 text-sm text-destructive"
          >
            We could not load your cart.{" "}
            <button
              className="underline"
              onClick={cart.retry}
            >
              Try again
            </button>
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={!canPlace}
          onClick={() => void place()}
        >
          {submitting
            ? "Placing order…"
            : method === "CARD"
              ? "Pay by card"
              : "Place order"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          By placing your order you accept the{" "}
          <Link href="/terms" className="underline">
            terms of sale
          </Link>{" "}
          and the{" "}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
        {addresses.length > 0 || (
          <p className="mt-2 text-xs text-muted-foreground">
            Add a delivery address to place your order.
          </p>
        )}
      </aside>
    </div>
  )
}

function Skeleton() {
  return (
    <div
      aria-hidden="true"
      className="mt-8 h-40 animate-pulse rounded-lg bg-muted"
    />
  )
}
