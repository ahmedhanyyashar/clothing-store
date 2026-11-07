"use client"

import { Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { MAX_QUANTITY } from "@/lib/cart/model"
import { useCartStore } from "@/lib/cart/store"
import type { CartRow as Row } from "@/lib/cart/summary"
import { formatPrice } from "@/lib/catalog/format"

export function CartRow({ row }: { row: Row }) {
  const setQuantity = useCartStore((s) => s.setQuantity)
  const remove = useCartStore((s) => s.remove)
  const { product, line, status } = row

  if (status === "loading") {
    return (
      <li
        aria-hidden="true"
        className="h-28 animate-pulse rounded-lg bg-muted"
      />
    )
  }

  const buyable = status === "ok" || status === "limited"
  const maxQuantity = Math.min(
    product?.stock ?? 0,
    MAX_QUANTITY
  )
  // the name is known for every row with a product
  const name = product?.name ?? "This item"

  return (
    <li className="flex gap-4 rounded-lg border border-border p-4">
      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
        {product?.imageUrl && (
          // decorative: the name beside it already says what this is
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">
              {product ? (
                <Link
                  href={`/products/${product.productId}`}
                  className="hover:underline"
                >
                  {name}
                </Link>
              ) : (
                name
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              Size {line.size}
              {product &&
                ` · ${formatPrice(product.priceCents)}`}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${name}, size ${line.size}`}
            onClick={() => remove(line)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>

        {status === "sold-out" && (
          <p className="text-sm text-destructive">
            Sold out in this size. It is not part of your
            total.
          </p>
        )}
        {status === "missing" && (
          <p className="text-sm text-destructive">
            No longer available. It is not part of your
            total.
          </p>
        )}
        {status === "limited" && (
          <p className="text-sm text-muted-foreground">
            Only {row.quantity} left in this size.
          </p>
        )}

        {buyable && (
          <div className="mt-auto flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Qty
              </span>
              <select
                aria-label={`Quantity for ${name}, size ${line.size}`}
                className="h-9 rounded-md border border-input bg-background px-2"
                value={row.quantity}
                onChange={(event) =>
                  setQuantity(
                    line,
                    Number(event.target.value)
                  )
                }
              >
                {Array.from(
                  { length: maxQuantity },
                  (_, i) => i + 1
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <p className="font-semibold">
              {formatPrice(row.totalCents)}
            </p>
          </div>
        )}
      </div>
    </li>
  )
}
