import type { Route } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"

/** Previous and next links for a list that has more than one page. */
export function Pagination({
  label,
  page,
  pageCount,
  href,
}: {
  label: string
  page: number
  pageCount: number
  href: (page: number) => Route
}) {
  if (pageCount <= 1) return null
  return (
    <nav
      aria-label={label}
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
  )
}
