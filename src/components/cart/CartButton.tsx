"use client"

import { ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useCart, useCartCount } from "@/lib/cart/use-cart"
import { formatPrice } from "@/lib/catalog/format"

import { CartLines } from "./CartLines"

/** The header's cart button, which opens the cart in a drawer. */
export function CartButton() {
  const count = useCartCount()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            count > 0
              ? `Cart, ${count} ${count === 1 ? "item" : "items"}`
              : "Cart"
          }
        >
          <ShoppingBag aria-hidden="true" />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground"
            >
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription className="sr-only">
            The items you have added and their total.
          </SheetDescription>
        </SheetHeader>
        <DrawerBody close={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

// Its own component so the cart's details are fetched only while the drawer is open.
function DrawerBody({ close }: { close: () => void }) {
  const cart = useCart()

  if (!cart.ready) return null

  if (cart.rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 px-4">
        <p className="text-muted-foreground">
          Your cart is empty.
        </p>
        <Button asChild variant="outline" onClick={close}>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4">
        <CartLines cart={cart} />
      </div>
      <SheetFooter className="border-t">
        <div className="flex justify-between font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(cart.subtotalCents)}</span>
        </div>
        <Button asChild onClick={close}>
          <Link href="/cart">View cart</Link>
        </Button>
      </SheetFooter>
    </>
  )
}
