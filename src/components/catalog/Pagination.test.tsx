import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it } from "vitest"

import { Pagination } from "./Pagination"

const view = {
  category: [] as string[],
  type: [] as string[],
  q: "",
  sort: "newest" as const,
}

describe("Pagination", () => {
  it("renders nothing when everything fits on one page", () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} view={view} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("marks the current page and links to the neighbours", () => {
    render(
      <Pagination page={2} pageCount={3} view={view} />
    )

    expect(
      screen.getByRole("link", { name: "Page 2" })
    ).toHaveAttribute("aria-current", "page")
    expect(
      screen.getByRole("link", { name: "Previous page" })
    ).toHaveAttribute("href", "/shop")
    expect(
      screen.getByRole("link", { name: "Next page" })
    ).toHaveAttribute("href", "/shop?page=3")
  })

  it("keeps the active filters, search and sort in every link", () => {
    render(
      <Pagination
        page={1}
        pageCount={2}
        view={{
          category: ["men", "women"],
          type: ["jeans"],
          q: "slim",
          sort: "price-asc",
        }}
      />
    )

    const href = screen
      .getByRole("link", { name: "Page 2" })
      .getAttribute("href")
    const params = new URL(href!, "http://shop.test")
      .searchParams

    expect(params.get("category")).toBe("men,women")
    expect(params.get("type")).toBe("jeans")
    expect(params.get("q")).toBe("slim")
    expect(params.get("sort")).toBe("price-asc")
    expect(params.get("page")).toBe("2")
  })

  it("shows at most five page numbers around the current one", () => {
    render(
      <Pagination page={10} pageCount={20} view={view} />
    )

    const numbers = screen
      .getAllByRole("link", { name: /^Page \d+$/ })
      .map((link) => link.textContent)

    expect(numbers).toEqual(["8", "9", "10", "11", "12"])
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Pagination page={2} pageCount={4} view={view} />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
