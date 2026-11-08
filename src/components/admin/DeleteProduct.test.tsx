import {
  render,
  screen,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { deleteProductAction } from "@/lib/admin/product-actions"

import { DeleteProduct } from "./DeleteProduct"

const push = vi.fn()
const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}))
vi.mock("@/lib/admin/product-actions", () => ({
  deleteProductAction: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

async function openDialog() {
  const user = userEvent.setup()
  await user.click(
    screen.getByRole("button", { name: "Delete product" })
  )
  return {
    user,
    dialog: screen.getByRole("alertdialog", {
      name: "Delete Classic Tee?",
    }),
  }
}

describe("DeleteProduct", () => {
  it("asks first and says what deleting means", async () => {
    render(<DeleteProduct id="p1" name="Classic Tee" />)

    const { user, dialog } = await openDialog()

    expect(dialog).toHaveTextContent(
      "Orders already placed keep their own copy"
    )
    expect(deleteProductAction).not.toHaveBeenCalled()
    await user.click(
      within(dialog).getByRole("button", {
        name: "Keep product",
      })
    )
    expect(deleteProductAction).not.toHaveBeenCalled()
  })

  it("deletes after confirmation and goes back to the list", async () => {
    vi.mocked(deleteProductAction).mockResolvedValue({
      ok: true,
    })
    render(<DeleteProduct id="p1" name="Classic Tee" />)
    const { user, dialog } = await openDialog()

    await user.click(
      within(dialog).getByRole("button", {
        name: "Delete product",
      })
    )

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith("/admin/products")
    )
    expect(deleteProductAction).toHaveBeenCalledWith("p1")
    expect(refresh).toHaveBeenCalled()
  })

  it("keeps the dialog open and says why when it could not", async () => {
    vi.mocked(deleteProductAction).mockResolvedValue({
      ok: false,
      message: "That product no longer exists.",
    })
    render(<DeleteProduct id="p1" name="Classic Tee" />)
    const { user, dialog } = await openDialog()

    await user.click(
      within(dialog).getByRole("button", {
        name: "Delete product",
      })
    )

    expect(
      await within(dialog).findByRole("alert")
    ).toHaveTextContent("no longer exists")
    expect(push).not.toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <DeleteProduct id="p1" name="Classic Tee" />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
