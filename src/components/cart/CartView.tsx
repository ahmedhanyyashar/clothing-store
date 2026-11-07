"use client"

import Link from "next/link"

import { EmptyState } from "@/components/catalog/EmptyState"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart/use-cart"
import { formatPrice } from "@/lib/catalog/format"

import { CartLines } from "./CartLines"

/** The cart page. */
export function CartView() {
  const cart = useCart()

  // the cart is in the browser: until it is read, the page cannot say if it is empty
  if (!cart.ready) {
    return (
      <div
        aria-hidden="true"
        className="mt-8 h-28 animate-pulse rounded-lg bg-muted"
      />
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

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <CartLines cart={cart} />
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
          <div className="flex justify-between text-base font-semibold">
            <dt>Subtotal</dt>
            <dd>{formatPrice(cart.subtotalCents)}</dd>
          </div>
        </dl>
        <Button
          asChild
          variant="outline"
          className="mt-6 w-full"
        >
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </aside>
    </div>
  )
}
