import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import { describe, expect, it, vi } from "vitest"

import { SearchBox } from "./SearchBox"
import { SortSelect } from "./SortSelect"

function renderWithUrl(
  ui: React.ReactNode,
  searchParams = ""
) {
  const onUrlUpdate = vi.fn()
  const view = render(
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={onUrlUpdate}
    >
      {ui}
    </NuqsTestingAdapter>
  )
  return { ...view, onUrlUpdate }
}

describe("SortSelect", () => {
  it("shows the current order and defaults to newest", () => {
    renderWithUrl(<SortSelect />, "?sort=price-desc")

    expect(
      screen.getByRole("combobox", { name: "Sort by" })
    ).toHaveValue("price-desc")
  })

  it("puts the chosen order in the URL and returns to the first page", async () => {
    const { onUrlUpdate } = renderWithUrl(
      <SortSelect />,
      "?page=4"
    )

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Sort by" }),
      "price-asc"
    )

    const { queryString } = onUrlUpdate.mock.lastCall![0]
    expect(queryString).toContain("sort=price-asc")
    expect(queryString).not.toContain("page=")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderWithUrl(<SortSelect />)

    expect(await axe(container)).toHaveNoViolations()
  })
})

describe("SearchBox", () => {
  it("starts with the search already in the URL", () => {
    renderWithUrl(<SearchBox />, "?q=denim")

    expect(
      screen.getByRole("searchbox", {
        name: "Search products",
      })
    ).toHaveValue("denim")
  })

  it("searches on submit, trims the text and returns to the first page", async () => {
    const { onUrlUpdate } = renderWithUrl(
      <SearchBox />,
      "?page=3"
    )

    await userEvent.type(
      screen.getByRole("searchbox", {
        name: "Search products",
      }),
      "  hoodie  {Enter}"
    )

    const { queryString } = onUrlUpdate.mock.lastCall![0]
    expect(queryString).toContain("q=hoodie")
    expect(queryString).not.toContain("page=")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderWithUrl(<SearchBox />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
