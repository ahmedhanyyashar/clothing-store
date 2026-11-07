"use client"

import { Search } from "lucide-react"
import { useQueryStates } from "nuqs"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { shopParsers } from "@/lib/catalog/search-params"

export function SearchBox() {
  const [{ q }, setParams] = useQueryStates(
    { q: shopParsers.q, page: shopParsers.page },
    { shallow: false }
  )

  return (
    // keyed by the current search, so the field follows the URL (for example
    // after "clear all filters") while still letting the user type freely
    <form
      key={q}
      role="search"
      className="flex w-full max-w-sm gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const value = new FormData(event.currentTarget).get(
          "q"
        )
        void setParams({
          q: String(value ?? "").trim(),
          page: null,
        })
      }}
    >
      <Input
        name="q"
        type="search"
        aria-label="Search products"
        placeholder="Search products"
        defaultValue={q}
      />
      <Button type="submit" size="icon" aria-label="Search">
        <Search />
      </Button>
    </form>
  )
}
