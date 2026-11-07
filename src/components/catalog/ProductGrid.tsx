import type { ProductSummary } from "@/lib/catalog/queries"

import { ProductCard } from "./ProductCard"

export function ProductGrid({
  products,
}: {
  products: ProductSummary[]
}) {
  return (
    <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          {/* the first image is the likeliest to be seen first, so load it early */}
          <ProductCard
            product={product}
            priority={index === 0}
          />
        </li>
      ))}
    </ul>
  )
}
