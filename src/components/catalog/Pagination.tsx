import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { shopHref } from "@/lib/catalog/search-params"
import { cn } from "@/lib/utils"

type View = {
  category: string[]
  type: string[]
  q: string
  sort: "newest" | "price-asc" | "price-desc"
}

/** At most `size` page numbers, kept around the current page. */
function visiblePages(
  page: number,
  pageCount: number,
  size = 5
) {
  const start = Math.max(
    1,
    Math.min(page - 2, pageCount - size + 1)
  )
  const end = Math.min(pageCount, start + size - 1)
  return Array.from(
    { length: end - start + 1 },
    (_, index) => start + index
  )
}

/** Links to the other pages of the same filtered view. */
export function Pagination({
  page,
  pageCount,
  view,
}: {
  page: number
  pageCount: number
  view: View
}) {
  if (pageCount <= 1) return null

  const hrefFor = (target: number) =>
    shopHref({ ...view, page: target })
  const linkClass =
    "border-border hover:bg-accent inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm"

  return (
    <nav aria-label="Pagination" className="mt-10">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {page > 1 && (
          <li>
            <Link
              href={hrefFor(page - 1)}
              className={linkClass}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Link>
          </li>
        )}
        {visiblePages(page, pageCount).map((target) => (
          <li key={target}>
            <Link
              href={hrefFor(target)}
              aria-label={`Page ${target}`}
              aria-current={
                target === page ? "page" : undefined
              }
              className={cn(
                linkClass,
                target === page &&
                  "bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              {target}
            </Link>
          </li>
        ))}
        {page < pageCount && (
          <li>
            <Link
              href={hrefFor(page + 1)}
              className={linkClass}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
