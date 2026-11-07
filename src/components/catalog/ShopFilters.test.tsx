import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import { describe, expect, it, vi } from "vitest"

import { ShopFilters } from "./ShopFilters"

function renderFilters(searchParams = "") {
  const onUrlUpdate = vi.fn()
  const view = render(
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={onUrlUpdate}
    >
      <ShopFilters />
    </NuqsTestingAdapter>
  )
  return { ...view, onUrlUpdate }
}

describe("ShopFilters", () => {
  it("reflects the filters that are already in the URL", () => {
    renderFilters("?category=men,women&type=jeans")

    expect(
      screen.getByRole("checkbox", { name: "Men" })
    ).toBeChecked()
    expect(
      screen.getByRole("checkbox", { name: "Women" })
    ).toBeChecked()
    expect(
      screen.getByRole("checkbox", { name: "Children" })
    ).not.toBeChecked()
    expect(
      screen.getByRole("checkbox", { name: "Jeans" })
    ).toBeChecked()
  })

  it("adds a category to the URL when it is ticked", async () => {
    const { onUrlUpdate } = renderFilters("?category=men")

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Women" })
    )

    expect(onUrlUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryString: expect.stringMatching(
          /category=men(,|%2C)women/
        ),
      })
    )
  })

  it("removes a category when it is unticked", async () => {
    const { onUrlUpdate } = renderFilters(
      "?category=men,women"
    )

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Men" })
    )

    const { queryString } = onUrlUpdate.mock.lastCall![0]
    expect(queryString).toContain("category=women")
    expect(queryString).not.toContain("men%2C")
  })

  it("starts again from the first page whenever a filter changes", async () => {
    const { onUrlUpdate } = renderFilters("?page=3")

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Shirts" })
    )

    const { queryString } = onUrlUpdate.mock.lastCall![0]
    expect(queryString).toContain("type=shirts")
    expect(queryString).not.toContain("page=")
  })

  it("offers to clear everything only while a filter or search is active", () => {
    const { unmount } = renderFilters("")
    expect(
      screen.queryByRole("link", {
        name: "Clear all filters",
      })
    ).not.toBeInTheDocument()
    unmount()

    renderFilters("?q=denim")
    expect(
      screen.getByRole("link", {
        name: "Clear all filters",
      })
    ).toHaveAttribute("href", "/shop")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderFilters("?category=men")

    expect(await axe(container)).toHaveNoViolations()
  })
})
