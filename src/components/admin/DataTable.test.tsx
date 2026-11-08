import {
  render,
  screen,
  within,
} from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it } from "vitest"

import { DataTable, type Column } from "./DataTable"

type Row = { id: string; name: string; price: number }
type Key = "name" | "price"

const rows: Row[] = [
  { id: "a", name: "Tee", price: 20 },
  { id: "b", name: "Jeans", price: 55 },
]
const columns: Column<Row, Key>[] = [
  {
    id: "name",
    header: "Name",
    sortKey: "name",
    cell: (row) => row.name,
  },
  {
    id: "price",
    header: "Price",
    sortKey: "price",
    align: "right",
    cell: (row) => `$${row.price}`,
  },
  { id: "note", header: "Note", cell: () => "ok" },
]

function table(sort: { key: Key; dir: "asc" | "desc" }) {
  return (
    <DataTable
      caption="Products"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      sort={sort}
      sortHref={(key, dir) =>
        `/list?sort=${key}&dir=${dir}` as never
      }
    />
  )
}

describe("DataTable", () => {
  it("shows a row for each item with the cells of each column", () => {
    render(table({ key: "name", dir: "asc" }))

    const body = screen.getAllByRole("row").slice(1)
    expect(body).toHaveLength(2)
    expect(
      within(body[1]).getByText("$55")
    ).toBeInTheDocument()
  })

  it("marks the sorted heading for screen readers, and only that one", () => {
    render(table({ key: "price", dir: "desc" }))

    expect(
      screen.getByRole("columnheader", { name: /Price/ })
    ).toHaveAttribute("aria-sort", "descending")
    expect(
      screen.getByRole("columnheader", { name: /Name/ })
    ).not.toHaveAttribute("aria-sort")
  })

  it("links a heading to the opposite order when it is the current column, and ascending otherwise", () => {
    render(table({ key: "name", dir: "asc" }))

    expect(
      screen.getByRole("link", { name: /Name/ })
    ).toHaveAttribute("href", "/list?sort=name&dir=desc")
    expect(
      screen.getByRole("link", { name: /Price/ })
    ).toHaveAttribute("href", "/list?sort=price&dir=asc")
  })

  it("leaves a heading without a sort key as plain text", () => {
    render(table({ key: "name", dir: "asc" }))

    expect(
      screen.queryByRole("link", { name: "Note" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: "Note" })
    ).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      table({ key: "name", dir: "asc" })
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
