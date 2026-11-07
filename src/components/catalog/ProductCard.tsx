import Image from "next/image"
import Link from "next/link"

import { formatPrice } from "@/lib/catalog/format"
import type { ProductSummary } from "@/lib/catalog/queries"

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductSummary
  priority?: boolean
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition duration-300 focus-within:ring-2 focus-within:ring-ring hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-4/5 overflow-hidden bg-muted">
        {product.imageUrl && (
          // decorative: the link below already names the product
          <Image
            src={product.imageUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {!product.inStock && (
          <span className="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium">
            Sold out
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 font-semibold">
          {/* one link per card; its box is stretched over the whole card */}
          <Link
            href={`/products/${product.id}`}
            className="outline-none after:absolute after:inset-0"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 text-lg font-bold">
          {formatPrice(product.priceCents)}
        </p>
      </div>
    </article>
  )
}
