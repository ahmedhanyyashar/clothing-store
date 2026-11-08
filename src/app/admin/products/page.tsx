import type { Metadata, Route } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { DataTable } from "@/components/admin/DataTable"
import { Pagination } from "@/components/admin/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_PRODUCT_SORT,
  listAdminProducts,
  PRODUCT_SORTS,
} from "@/lib/admin/product-queries"
import { parseSort } from "@/lib/admin/sorting"
import { requireRole } from "@/lib/auth/session"
import { formatPrice } from "@/lib/catalog/format"
import {
  CATEGORY_INFO,
  TYPE_INFO,
} from "@/lib/catalog/taxonomy"

export const metadata: Metadata = { title: "Products" }

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    page?: string
    sort?: string
    dir?: string
  }>
}) {
  await requireRole("ADMIN", "/admin/products")
  const params = await searchParams
  const q = params.q?.trim().slice(0, 100) || undefined
  const page = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1
  )
  const sort = parseSort(
    params,
    PRODUCT_SORTS,
    DEFAULT_PRODUCT_SORT
  )

  const { products, total, pageCount } =
    await listAdminProducts({ q, page, sort })
  // a page past the end is as missing as any other address
  if (page > pageCount) notFound()

  // links keep the search and the sort; a new sort starts again at page 1
  const href = (
    n: number,
    order: { key: string; dir: string } = sort
  ) => {
    const next = new URLSearchParams()
    if (q) next.set("q", q)
    if (
      order.key !== DEFAULT_PRODUCT_SORT.key ||
      order.dir !== DEFAULT_PRODUCT_SORT.dir
    ) {
      next.set("sort", order.key)
      next.set("dir", order.dir)
    }
    if (n > 1) next.set("page", String(n))
    const query = next.toString()
    return `/admin/products${query ? `?${query}` : ""}` as Route
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Products
          </h2>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "product" : "products"}
            {q ? " match" : ""}. Choose a heading to sort.
          </p>
        </div>
        <Button asChild>
          <Link href={"/admin/products/new" as Route}>
            Add product
          </Link>
        </Button>
      </div>

      <form method="get" className="flex items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1 text-sm">
          <span className="text-muted-foreground">
            Search by name
          </span>
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
          />
        </label>
        {/* searching keeps the sort */}
        <input type="hidden" name="sort" value={sort.key} />
        <input type="hidden" name="dir" value={sort.dir} />
        <Button type="submit">Search</Button>
        {q && (
          <Button asChild variant="ghost">
            <Link href={"/admin/products" as Route}>
              Clear
            </Link>
          </Button>
        )}
      </form>

      {products.length === 0 ? (
        <p className="text-muted-foreground">
          {q
            ? "No products match this search."
            : "There are no products yet."}
        </p>
      ) : (
        <DataTable
          caption="Products"
          rows={products}
          rowKey={(product) => product.id}
          sort={sort}
          sortHref={(key, dir) => href(1, { key, dir })}
          columns={[
            {
              id: "photo",
              header: (
                <span className="sr-only">Photo</span>
              ),
              cell: (product) => {
                const image = product.images[0]?.url
                return (
                  <div className="relative h-12 w-10 overflow-hidden rounded bg-muted">
                    {image && (
                      // decorative: the name beside it says what it is
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    )}
                  </div>
                )
              },
            },
            {
              id: "name",
              header: "Name",
              sortKey: "name",
              className: "font-medium",
              cell: (product) => (
                <>
                  <Link
                    href={
                      `/admin/products/${product.id}` as Route
                    }
                    className="underline-offset-4 hover:underline"
                  >
                    {product.name}
                  </Link>
                  {product.bestSeller && (
                    <Badge
                      variant="secondary"
                      className="ml-2"
                    >
                      Best seller
                    </Badge>
                  )}
                </>
              ),
            },
            {
              id: "category",
              header: "Category",
              sortKey: "category",
              cell: (product) => (
                <>
                  {CATEGORY_INFO[product.category].label} ·{" "}
                  {TYPE_INFO[product.type].label}
                </>
              ),
            },
            {
              id: "price",
              header: "Price",
              sortKey: "price",
              align: "right",
              cell: (product) =>
                formatPrice(product.priceCents),
            },
            {
              id: "stock",
              header: "In stock",
              align: "right",
              cell: (product) => {
                const stock = product.sizes.reduce(
                  (sum, s) => sum + s.stock,
                  0
                )
                return stock === 0 ? (
                  <Badge variant="destructive">
                    Sold out
                  </Badge>
                ) : (
                  stock
                )
              },
            },
          ]}
        />
      )}

      <Pagination
        label="Product pages"
        page={page}
        pageCount={pageCount}
        href={(n) => href(n)}
      />
    </>
  )
}
