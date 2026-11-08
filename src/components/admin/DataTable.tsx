import type { Route } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  nextDirection,
  type Sort,
  type SortDirection,
} from "@/lib/admin/sorting"
import { cn } from "@/lib/utils"

export type Column<Row, Key extends string> = {
  id: string
  header: ReactNode
  /** The sort key this heading sorts by. Without one the heading is plain text. */
  sortKey?: Key
  align?: "right"
  className?: string
  cell: (row: Row) => ReactNode
}

const ARIA_SORT = {
  asc: "ascending",
  desc: "descending",
} as const

/**
 * A table of rows with headings that sort. It holds no state: the sort lives in
 * the address, so a sorted view survives a reload, can be shared, and works
 * without JavaScript. The page reads the sort, asks the database for it, and
 * says where a heading's link goes with `sortHref`.
 */
export function DataTable<Row, Key extends string>({
  caption,
  columns,
  rows,
  rowKey,
  sort,
  sortHref,
}: {
  caption: string
  columns: Column<Row, Key>[]
  rows: Row[]
  rowKey: (row: Row) => string
  sort: Sort<Key>
  sortHref: (key: Key, dir: SortDirection) => Route
}) {
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableCaption className="sr-only">
          {caption}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const key = column.sortKey
              const current =
                key !== undefined && key === sort.key
              return (
                <TableHead
                  key={column.id}
                  aria-sort={
                    current
                      ? ARIA_SORT[sort.dir]
                      : undefined
                  }
                  className={cn(
                    column.align === "right" && "text-right"
                  )}
                >
                  {key === undefined ? (
                    column.header
                  ) : (
                    <Link
                      href={sortHref(
                        key,
                        nextDirection(sort, key)
                      )}
                      className={cn(
                        "inline-flex items-center gap-1 underline-offset-4 hover:underline",
                        column.align === "right" &&
                          "flex-row-reverse"
                      )}
                    >
                      {column.header}
                      <span
                        aria-hidden="true"
                        className="text-xs text-muted-foreground"
                      >
                        {current
                          ? sort.dir === "asc"
                            ? "▲"
                            : "▼"
                          : "↕"}
                      </span>
                    </Link>
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  className={cn(
                    column.align === "right" &&
                      "text-right",
                    column.className
                  )}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
