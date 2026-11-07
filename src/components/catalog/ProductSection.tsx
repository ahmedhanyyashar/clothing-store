import Link from "next/link"

import type { ProductSummary } from "@/lib/catalog/queries"

import { ProductGrid } from "./ProductGrid"

/** A titled row of products, as on the home page. */
export function ProductSection({
  title,
  description,
  products,
}: {
  title: string
  description: string
  products: ProductSummary[]
}) {
  return (
    <section className="py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-2 max-w-prose text-muted-foreground">
            {description}
          </p>
        </div>
        <Link
          href="/shop"
          className="text-sm font-medium underline"
        >
          View all
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  )
}
