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

import { saveAddress } from "@/lib/address/actions"
import type { SavedAddress } from "@/lib/address/queries"

import { AddressForm } from "./AddressForm"

const push = vi.fn()
const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}))
vi.mock("@/lib/address/actions", () => ({
  saveAddress: vi.fn(),
}))

const saved: SavedAddress = {
  id: "addr1",
  label: "Home",
  fullName: "Ada Lovelace",
  phone: "+12025550123",
  line1: "1 Main St",
  line2: null,
  city: "Austin",
  region: "Texas",
  postalCode: "73301",
  country: "US",
  notes: null,
  isDefault: false,
  createdAt: new Date(),
}

async function fillUs() {
  const user = userEvent.setup()
  await user.type(
    screen.getByLabelText("Full name"),
    "Ada Lovelace"
  )
  await user.type(
    screen.getByLabelText("Phone"),
    "202 555 0123"
  )
  await user.type(
    screen.getByLabelText("Street address"),
    "1 Main St"
  )
  await user.type(screen.getByLabelText("City"), "Austin")
  await user.selectOptions(
    screen.getByLabelText("State"),
    "Texas"
  )
  await user.type(
    screen.getByLabelText("Postal code"),
    "73301"
  )
  return user
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(
    screen.getByRole("button", { name: "Save address" })
  )

beforeEach(() => vi.resetAllMocks())

describe("AddressForm", () => {
  it("saves a valid address and goes back to the list", async () => {
    vi.mocked(saveAddress).mockResolvedValue({ ok: true })
    render(<AddressForm />)

    await submit(await fillUs())

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/account/addresses"
      )
    )
    expect(saveAddress).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        fullName: "Ada Lovelace",
        country: "US",
        region: "Texas",
        postalCode: "73301",
      })
    )
    expect(refresh).toHaveBeenCalled()
  })

  it("shows what is wrong and sends nothing", async () => {
    const user = userEvent.setup()
    render(<AddressForm />)

    await submit(user)

    expect(
      await screen.findByText("Enter the recipient's name")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Enter the street address")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Choose a state")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Enter a postal code")
    ).toBeInTheDocument()
    expect(saveAddress).not.toHaveBeenCalled()
  })

  it("changes its fields with the country", async () => {
    const user = userEvent.setup()
    render(<AddressForm />)

    // the United States: a list of states and a postal code
    expect(screen.getByLabelText("State").tagName).toBe(
      "SELECT"
    )
    expect(
      screen.getByLabelText("Postal code")
    ).toHaveAttribute("placeholder", "90210")

    await user.selectOptions(
      screen.getByLabelText("Country"),
      "GB"
    )
    expect(
      screen.getByLabelText("County (optional)").tagName
    ).toBe("INPUT")
    expect(
      screen.getByLabelText("Postal code")
    ).toHaveAttribute("placeholder", "SW1A 1AA")

    // the United Arab Emirates have no postal codes
    await user.selectOptions(
      screen.getByLabelText("Country"),
      "AE"
    )
    expect(
      screen.queryByLabelText("Postal code")
    ).not.toBeInTheDocument()
    expect(
      screen.getByLabelText("Emirate (optional)")
    ).toBeInTheDocument()
  })

  it("shows the server's message beside the field it is about", async () => {
    vi.mocked(saveAddress).mockResolvedValue({
      ok: false,
      fieldErrors: {
        postalCode:
          "Enter a valid postal code, for example 90210",
      },
    })
    render(<AddressForm />)

    await submit(await fillUs())

    expect(
      await screen.findByText(/Enter a valid postal code/)
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it("shows a message about the request as a whole", async () => {
    vi.mocked(saveAddress).mockResolvedValue({
      ok: false,
      message:
        "You can save up to 10 addresses. Delete one to add another.",
    })
    render(<AddressForm />)

    await submit(await fillUs())

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("up to 10 addresses")
  })

  it("makes the first address the default, without a choice", () => {
    render(<AddressForm isFirst />)

    const box = screen.getByRole("checkbox", {
      name: "Default address",
    })
    expect(box).toBeChecked()
    expect(box).toBeDisabled()
  })

  it("lets a later address ask to become the default", async () => {
    vi.mocked(saveAddress).mockResolvedValue({ ok: true })
    render(<AddressForm />)
    const user = await fillUs()

    await user.click(
      screen.getByRole("checkbox", {
        name: "Make this my default address",
      })
    )
    await submit(user)

    await vi.waitFor(() =>
      expect(saveAddress).toHaveBeenCalled()
    )
    expect(saveAddress).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ isDefault: true })
    )
  })

  it("edits an existing address, starting from what is saved", async () => {
    vi.mocked(saveAddress).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<AddressForm address={saved} />)

    expect(screen.getByLabelText("Full name")).toHaveValue(
      "Ada Lovelace"
    )
    expect(screen.getByLabelText("State")).toHaveValue(
      "Texas"
    )
    await user.clear(screen.getByLabelText("City"))
    await user.type(screen.getByLabelText("City"), "Dallas")
    await submit(user)

    await vi.waitFor(() =>
      expect(saveAddress).toHaveBeenCalled()
    )
    expect(saveAddress).toHaveBeenCalledWith(
      "addr1",
      expect.objectContaining({ city: "Dallas" })
    )
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<AddressForm />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
