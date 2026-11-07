import { AddToCart } from "@/components/cart/AddToCart"
import { formatPrice } from "@/lib/catalog/format"
import type { ProductDetails } from "@/lib/catalog/queries"
import {
  CATEGORY_INFO,
  TYPE_INFO,
} from "@/lib/catalog/taxonomy"
import { cn } from "@/lib/utils"

export function ProductInfo({
  product,
}: {
  product: ProductDetails
}) {
  const inStock = product.sizes.some(
    (size) => size.stock > 0
  )

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {CATEGORY_INFO[product.category].label} ·{" "}
        {TYPE_INFO[product.type].label}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {product.name}
      </h1>
      <p className="mt-4 text-2xl font-bold">
        {formatPrice(product.priceCents)}
      </p>
      <p
        className={cn(
          "mt-2 text-sm font-medium",
          inStock
            ? "text-muted-foreground"
            : "text-destructive"
        )}
      >
        {inStock ? "In stock" : "Sold out"}
      </p>
      <p className="mt-6 leading-7 text-muted-foreground">
        {product.description}
      </p>

      <AddToCart
        productId={product.id}
        sizes={product.sizes}
      />

      {product.colors.length > 0 && (
        <section
          aria-labelledby="colors-heading"
          className="mt-8"
        >
          <h2
            id="colors-heading"
            className="text-sm font-semibold"
          >
            Colors
          </h2>
          <ul className="mt-3 flex flex-wrap gap-4">
            {product.colors.map((color) => (
              <li
                key={color.name}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  aria-hidden="true"
                  className="size-5 rounded-full border border-border"
                  style={{ backgroundColor: color.hex }}
                />
                {color.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
