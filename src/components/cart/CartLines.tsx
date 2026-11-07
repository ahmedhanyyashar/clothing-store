"use client"

import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart/use-cart"

import { CartRow } from "./CartRow"

type Cart = ReturnType<typeof useCart>

/** The cart's lines, with its loading and error states. Shared by the drawer and the page. */
export function CartLines({ cart }: { cart: Cart }) {
  if (cart.failed) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3"
      >
        <p className="text-sm text-destructive">
          We could not load your cart.
        </p>
        <Button variant="outline" onClick={cart.retry}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {cart.rows.map((row) => (
        <CartRow key={row.key} row={row} />
      ))}
    </ul>
  )
}
