import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { Suspense } from "react"

import { EmptyState } from "@/components/catalog/EmptyState"
import { Pagination } from "@/components/catalog/Pagination"
import { ProductGrid } from "@/components/catalog/ProductGrid"
import { ProductGridSkeleton } from "@/components/catalog/ProductGridSkeleton"
import { SearchBox } from "@/components/catalog/SearchBox"
import { ShopFilters } from "@/components/catalog/ShopFilters"
import { SortSelect } from "@/components/catalog/SortSelect"
import { Container } from "@/components/layout/Container"
import {
  listProducts,
  PAGE_SIZE,
} from "@/lib/catalog/queries"
import {
  shopHref,
  shopSearchParams,
  toShopQuery,
} from "@/lib/catalog/search-params"

export const metadata: Metadata = { title: "Shop" }

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const view = await shopSearchParams.parse(searchParams)

  return (
    <Container className="py-12">
      <h1 className="text-4xl font-semibold tracking-tight">
        Shop
      </h1>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <ShopFilters />

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <SearchBox />
            <SortSelect />
          </div>

          {/* keyed by the view, so a new filter shows the skeleton again */}
          <Suspense
            key={JSON.stringify(view)}
            fallback={<ProductGridSkeleton />}
          >
            <Results view={view} />
          </Suspense>
        </div>
      </div>
    </Container>
  )
}

async function Results({
  view,
}: {
  view: Awaited<ReturnType<typeof shopSearchParams.parse>>
}) {
  const { items, total, page, pageCount } =
    await listProducts(toShopQuery(view))

  // a page number past the end is a bad link, not an empty shop
  if (page > pageCount) notFound()

  if (total === 0) {
    return (
      <EmptyState
        message="No products match these filters."
        action={
          <Link
            href={shopHref()}
            className="text-sm font-medium underline"
          >
            Clear all filters
          </Link>
        }
      />
    )
  }

  const first = (page - 1) * PAGE_SIZE + 1
  const last = first + items.length - 1

  return (
    <>
      <p
        className="mb-4 text-sm text-muted-foreground"
        aria-live="polite"
      >
        Showing {first}–{last} of {total}{" "}
        {total === 1 ? "product" : "products"}
      </p>
      <ProductGrid products={items} />
      <Pagination
        page={page}
        pageCount={pageCount}
        view={view}
      />
    </>
  )
}
