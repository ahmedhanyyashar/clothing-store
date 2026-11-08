import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "jest-axe"
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { saveProductAction } from "@/lib/admin/product-actions"
import type { ProductInput } from "@/lib/admin/product-validations"
import { uploadPhotos } from "@/lib/storage/browser"

import { ProductForm } from "./ProductForm"

const push = vi.fn()
const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}))
vi.mock("@/lib/storage/browser", () => ({
  uploadPhotos: vi.fn(),
}))
vi.mock("@/lib/admin/product-actions", () => ({
  saveProductAction: vi.fn(),
}))

const save = vi.mocked(saveProductAction)

const existing: ProductInput = {
  name: "Classic Tee",
  description: "A soft cotton tee.",
  price: "24.99",
  category: "MEN",
  type: "T_SHIRTS",
  bestSeller: false,
  sizes: [
    { label: "S", stock: 5, expectedStock: 5 },
    { label: "M", stock: 10, expectedStock: 10 },
  ],
  photos: [],
  colors: [{ name: "White", hex: "#ffffff" }],
}

beforeEach(() => vi.resetAllMocks())

describe("ProductForm for a new product", () => {
  it("starts with one size row that cannot be removed", () => {
    render(<ProductForm />)

    expect(
      screen.getByLabelText("Size 1")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Remove size 1" })
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Add product" })
    ).toBeInTheDocument()
  })

  it("adds and removes size and color rows", async () => {
    const user = userEvent.setup()
    render(<ProductForm />)

    await user.click(
      screen.getByRole("button", { name: "Add a size" })
    )
    expect(
      screen.getByLabelText("Size 2")
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "Remove size 2" })
    )
    expect(
      screen.queryByLabelText("Size 2")
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Add a color" })
    )
    expect(
      screen.getByLabelText("Color name 1")
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "Remove color 1" })
    )
    expect(
      screen.queryByLabelText("Color name 1")
    ).not.toBeInTheDocument()
  })

  it("says what is missing and sends nothing", async () => {
    const user = userEvent.setup()
    render(<ProductForm />)

    await user.click(
      screen.getByRole("button", { name: "Add product" })
    )

    expect(
      await screen.findByText(
        "Name must be at least 2 characters"
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText("Enter a description")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Enter a price such as 24.99")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Enter a size")
    ).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it("sends what was typed, with the price as text and the stock as a number, and returns to the list", async () => {
    save.mockResolvedValue({
      ok: true,
      id: "p1",
      changed: true,
    })
    const user = userEvent.setup()
    render(<ProductForm />)

    await user.type(
      screen.getByLabelText("Name"),
      "Slim Jeans"
    )
    await user.type(
      screen.getByLabelText("Description"),
      "Stretch denim."
    )
    await user.type(
      screen.getByLabelText("Price (USD)"),
      "54.99"
    )
    await user.selectOptions(
      screen.getByLabelText("Category"),
      "WOMEN"
    )
    await user.selectOptions(
      screen.getByLabelText("Type"),
      "JEANS"
    )
    await user.type(screen.getByLabelText("Size 1"), "30")
    await user.clear(
      screen.getByLabelText("Stock of size 1")
    )
    await user.type(
      screen.getByLabelText("Stock of size 1"),
      "6"
    )
    await user.click(screen.getByRole("checkbox"))
    await user.click(
      screen.getByRole("button", { name: "Add product" })
    )

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith("/admin/products")
    )
    expect(save).toHaveBeenCalledWith(null, {
      name: "Slim Jeans",
      description: "Stretch denim.",
      price: "54.99",
      category: "WOMEN",
      type: "JEANS",
      bestSeller: true,
      sizes: [
        { label: "30", stock: 6, expectedStock: null },
      ],
      photos: [],
      colors: [],
    })
    expect(refresh).toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ProductForm />)

    expect(await axe(container)).toHaveNoViolations()
  })
})

describe("ProductForm for an existing product", () => {
  it("shows what is saved, and does not let a size be renamed", () => {
    render(<ProductForm id="p1" product={existing} />)

    expect(screen.getByLabelText("Name")).toHaveValue(
      "Classic Tee"
    )
    expect(
      screen.getByLabelText("Price (USD)")
    ).toHaveValue("24.99")
    expect(screen.getByLabelText("Size 1")).toHaveValue("S")
    expect(screen.getByLabelText("Size 1")).toHaveAttribute(
      "readonly"
    )
    expect(
      screen.getByLabelText("Stock of size M")
    ).toHaveValue(10)
    expect(
      screen.getByRole("button", { name: "Save changes" })
    ).toBeInTheDocument()
  })

  it("sends the stock each size had when the page loaded, along with the new one", async () => {
    save.mockResolvedValue({
      ok: true,
      id: "p1",
      changed: true,
    })
    const user = userEvent.setup()
    render(<ProductForm id="p1" product={existing} />)

    await user.clear(
      screen.getByLabelText("Stock of size M")
    )
    await user.type(
      screen.getByLabelText("Stock of size M"),
      "25"
    )
    await user.click(
      screen.getByRole("button", { name: "Save changes" })
    )

    await vi.waitFor(() => expect(save).toHaveBeenCalled())
    expect(save).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({
        sizes: [
          { label: "S", stock: 5, expectedStock: 5 },
          { label: "M", stock: 25, expectedStock: 10 },
        ],
      })
    )
  })

  it("shows the server's problems beside the fields they are about", async () => {
    save.mockResolvedValue({
      ok: false,
      fieldErrors: {
        price: "Enter a price such as 24.99",
        "sizes.1.stock": "Stock cannot be negative",
      },
    })
    const user = userEvent.setup()
    render(<ProductForm id="p1" product={existing} />)

    await user.click(
      screen.getByRole("button", { name: "Save changes" })
    )

    expect(
      await screen.findByText("Stock cannot be negative")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Enter a price such as 24.99")
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it("explains a refused save and stays on the page", async () => {
    save.mockResolvedValue({
      ok: false,
      message:
        "The stock of M changed since you opened this page.",
    })
    const user = userEvent.setup()
    render(<ProductForm id="p1" product={existing} />)

    await user.click(
      screen.getByRole("button", { name: "Save changes" })
    )

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("stock of M changed")
    expect(push).not.toHaveBeenCalled()
  })
})

describe("ProductForm photos", () => {
  const withPhotos: ProductInput = {
    ...existing,
    photos: [
      { id: "i1", key: null, url: "/products/a.webp" },
      { id: "i2", key: null, url: "/products/b.webp" },
    ],
  }
  const png = () =>
    new File([new Uint8Array(10)], "front.png", {
      type: "image/png",
    })

  it("uploads chosen files, shows them, and sends their keys with the save", async () => {
    vi.mocked(uploadPhotos).mockResolvedValue([
      {
        key: "products/0b1b6f0e-5a3e-4c1f-9d2a-1f0e5a3e4c1f.png",
        url: "/products/new.webp",
        name: "front.png",
      },
    ])
    save.mockResolvedValue({
      ok: true,
      id: "p1",
      changed: true,
    })
    const user = userEvent.setup()
    render(<ProductForm id="p1" product={withPhotos} />)

    await user.upload(
      screen.getByLabelText("Add photos"),
      png()
    )

    expect(
      await screen.findByRole("button", {
        name: "Remove photo 3",
      })
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole("button", { name: "Save changes" })
    )
    await vi.waitFor(() => expect(save).toHaveBeenCalled())
    expect(
      (save.mock.calls[0][1] as ProductInput).photos
    ).toEqual([
      { id: "i1", key: null, url: "/products/a.webp" },
      { id: "i2", key: null, url: "/products/b.webp" },
      {
        id: null,
        key: "products/0b1b6f0e-5a3e-4c1f-9d2a-1f0e5a3e4c1f.png",
        url: "/products/new.webp",
      },
    ])
  })

  it("says why an upload failed and keeps what was there", async () => {
    vi.mocked(uploadPhotos).mockRejectedValue(
      new Error("front.png could not be uploaded.")
    )
    const user = userEvent.setup()
    render(<ProductForm id="p1" product={withPhotos} />)

    await user.upload(
      screen.getByLabelText("Add photos"),
      png()
    )

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("front.png could not be uploaded.")
    expect(
      screen.queryByRole("button", {
        name: "Remove photo 3",
      })
    ).not.toBeInTheDocument()
  })

  it("moves and removes photos", async () => {
    save.mockResolvedValue({
      ok: true,
      id: "p1",
      changed: true,
    })
    const user = userEvent.setup()
    render(<ProductForm id="p1" product={withPhotos} />)

    expect(
      screen.getByText("Main photo")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: "Move photo 1 earlier",
      })
    ).toBeDisabled()
    await user.click(
      screen.getByRole("button", {
        name: "Move photo 2 earlier",
      })
    )
    await user.click(
      screen.getByRole("button", { name: "Remove photo 2" })
    )
    await user.click(
      screen.getByRole("button", { name: "Save changes" })
    )

    await vi.waitFor(() => expect(save).toHaveBeenCalled())
    expect(
      (save.mock.calls[0][1] as ProductInput).photos.map(
        (p) => p.id
      )
    ).toEqual(["i2"])
  })

  it("stops offering uploads at the limit", () => {
    render(
      <ProductForm
        id="p1"
        product={{
          ...existing,
          photos: Array.from({ length: 4 }, (_, i) => ({
            id: `i${i}`,
            key: null,
            url: "/products/a.webp",
          })),
        }}
      />
    )

    expect(
      screen.getByLabelText("Add photos")
    ).toBeDisabled()
  })

  it("has no accessibility violations with photos", async () => {
    const { container } = render(
      <ProductForm id="p1" product={withPhotos} />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
