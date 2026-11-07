"use client"

import { useQueryStates } from "nuqs"

import {
  shopParsers,
  SORTS,
  type Sort,
} from "@/lib/catalog/search-params"

const labels: Record<Sort, string> = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
}

// A native select: accessible and comfortable on phones without extra code.
export function SortSelect() {
  const [{ sort }, setParams] = useQueryStates(
    { sort: shopParsers.sort, page: shopParsers.page },
    { shallow: false }
  )

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Sort by</span>
      <select
        className="h-9 rounded-md border border-input bg-background px-3"
        value={sort}
        onChange={(event) =>
          // changing the order starts again from the first page
          void setParams({
            sort: event.target.value as Sort,
            page: null,
          })
        }
      >
        {SORTS.map((value) => (
          <option key={value} value={value}>
            {labels[value]}
          </option>
        ))}
      </select>
    </label>
  )
}
