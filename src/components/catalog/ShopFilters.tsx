"use client"

import Link from "next/link"
import { useQueryStates } from "nuqs"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  shopHref,
  shopParsers,
} from "@/lib/catalog/search-params"
import {
  CATEGORIES,
  CATEGORY_INFO,
  PRODUCT_TYPES,
  TYPE_INFO,
} from "@/lib/catalog/taxonomy"

const categoryOptions = CATEGORIES.map(
  (category) => CATEGORY_INFO[category]
)
const typeOptions = PRODUCT_TYPES.map(
  (type) => TYPE_INFO[type]
)

function toggle(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value]
}

export function ShopFilters() {
  const [{ category, type, q }, setParams] = useQueryStates(
    shopParsers,
    {
      shallow: false,
    }
  )
  // on small screens the filters fold away; from `sm` up they are always shown
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const active =
    category.length + type.length > 0 || q !== ""

  return (
    <aside
      aria-label="Filters"
      className="w-full lg:w-60 lg:shrink-0"
    >
      <Button
        type="button"
        variant="outline"
        className="w-full lg:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        Filters{active ? " (active)" : ""}
      </Button>

      <div
        id={panelId}
        className={`mt-4 space-y-6 lg:mt-0 lg:block ${open ? "block" : "hidden"}`}
      >
        <FilterGroup
          legend="Category"
          options={categoryOptions}
          selected={category}
          onToggle={(slug) =>
            // a new filter starts again from the first page
            void setParams({
              category: toggle(category, slug),
              page: null,
            })
          }
        />
        <FilterGroup
          legend="Type"
          options={typeOptions}
          selected={type}
          onToggle={(slug) =>
            void setParams({
              type: toggle(type, slug),
              page: null,
            })
          }
        />
        {active && (
          <Link
            href={shopHref()}
            className="text-sm font-medium underline"
          >
            Clear all filters
          </Link>
        )}
      </div>
    </aside>
  )
}

function FilterGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string
  options: { slug: string; label: string }[]
  selected: string[]
  onToggle: (slug: string) => void
}) {
  return (
    <fieldset className="rounded-xl border border-border p-5">
      <legend className="px-2 text-sm font-semibold tracking-wide">
        {legend}
      </legend>
      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.slug}
            className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground"
          >
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selected.includes(option.slug)}
              onChange={() => onToggle(option.slug)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
