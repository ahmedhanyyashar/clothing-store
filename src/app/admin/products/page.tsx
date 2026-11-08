import type { Metadata, Route } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listAdminProducts } from "@/lib/admin/product-queries"
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
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  await requireRole("ADMIN", "/admin/products")
  const params = await searchParams
  const q = params.q?.trim().slice(0, 100) || undefined
  const page = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1
  )

  const { products, total, pageCount } =
    await listAdminProducts({ q, page })
  // a page past the end is as missing as any other address
  if (page > pageCount) notFound()

  const href = (n: number) => {
    const next = new URLSearchParams()
    if (q) next.set("q", q)
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
            {q ? " match" : ""}, newest first.
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
        <Card className="overflow-hidden py-0">
          <Table>
            <TableCaption className="sr-only">
              Products
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <span className="sr-only">Photo</span>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">
                  Price
                </TableHead>
                <TableHead className="text-right">
                  In stock
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const stock = product.sizes.reduce(
                  (sum, s) => sum + s.stock,
                  0
                )
                const image = product.images[0]?.url
                return (
                  <TableRow key={product.id}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="font-medium">
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
                    </TableCell>
                    <TableCell>
                      {
                        CATEGORY_INFO[product.category]
                          .label
                      }{" "}
                      · {TYPE_INFO[product.type].label}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(product.priceCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {stock === 0 ? (
                        <Badge variant="destructive">
                          Sold out
                        </Badge>
                      ) : (
                        stock
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Product pages"
          className="flex items-center gap-3 text-sm"
        >
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page - 1)}>Previous</Link>
            </Button>
          )}
          <span>
            Page {page} of {pageCount}
          </span>
          {page < pageCount && (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page + 1)}>Next</Link>
            </Button>
          )}
        </nav>
      )}
    </>
  )
}
