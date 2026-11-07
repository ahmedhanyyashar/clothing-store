"use client"

import Link from "next/link"
import { useState, type SubmitEvent } from "react"

import { Button } from "@/components/ui/button"
import { MAX_QUANTITY } from "@/lib/cart/model"
import { useCartStore } from "@/lib/cart/store"

type Size = { label: string; stock: number }

/** Size and quantity pickers for a product page, with the button that adds it to the cart. */
export function AddToCart({
  productId,
  sizes,
}: {
  productId: string
  sizes: Size[]
}) {
  const add = useCartStore((state) => state.add)
  const [size, setSize] = useState<string>()
  const [wanted, setWanted] = useState(1)
  const [message, setMessage] = useState<{
    kind: "error" | "added"
    text: string
  }>()

  const soldOut = sizes.every((s) => s.stock === 0)
  const stock = sizes.find((s) => s.label === size)?.stock
  const limit = Math.min(
    stock ?? MAX_QUANTITY,
    MAX_QUANTITY
  )
  // switching to a size with less stock lowers the quantity with it
  const quantity = Math.min(wanted, limit)

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (size === undefined) {
      setMessage({ kind: "error", text: "Choose a size." })
      return
    }
    const added = add({ productId, size }, quantity, limit)
    setMessage({
      kind: "added",
      text:
        added < quantity
          ? "Your cart has the most we can offer."
          : "Added to your cart.",
    })
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8">
      <fieldset>
        <legend className="text-sm font-semibold">
          Size
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map((s) => (
            <label key={s.label} className="cursor-pointer">
              <input
                type="radio"
                name="size"
                value={s.label}
                checked={size === s.label}
                disabled={s.stock === 0}
                onChange={() => {
                  setSize(s.label)
                  setMessage(undefined)
                }}
                className="peer sr-only"
              />
              <span className="flex h-10 min-w-12 items-center justify-center rounded-md border border-border px-3 text-sm peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:text-muted-foreground peer-disabled:line-through peer-disabled:opacity-60">
                {s.label}
                {s.stock === 0 && (
                  <>
                    {" "}
                    <span className="sr-only">
                      (sold out)
                    </span>
                  </>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Quantity</span>
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={quantity}
            disabled={soldOut}
            onChange={(event) =>
              setWanted(Number(event.target.value))
            }
          >
            {Array.from(
              { length: limit },
              (_, i) => i + 1
            ).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="lg" disabled={soldOut}>
          {soldOut ? "Sold out" : "Add to cart"}
        </Button>
      </div>

      <p
        role={
          message?.kind === "error" ? "alert" : "status"
        }
        className={
          message?.kind === "error"
            ? "mt-3 text-sm text-destructive"
            : "mt-3 text-sm text-muted-foreground"
        }
      >
        {message?.text}
        {message?.kind === "added" && (
          <>
            {" "}
            <Link href="/cart" className="underline">
              View cart
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
