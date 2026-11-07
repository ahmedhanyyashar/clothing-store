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

import {
  makeDefaultAddress,
  removeAddress,
} from "@/lib/address/actions"

import { AddressActions } from "./AddressActions"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))
vi.mock("@/lib/address/actions", () => ({
  makeDefaultAddress: vi.fn(),
  removeAddress: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

describe("AddressActions", () => {
  it("links to the edit page, with a name that says which address", () => {
    render(
      <AddressActions
        id="a1"
        name="Home"
        isDefault={false}
      />
    )

    expect(
      screen.getByRole("link", { name: "Edit Home" })
    ).toHaveAttribute("href", "/account/addresses/a1")
  })

  it("makes an address the default", async () => {
    vi.mocked(makeDefaultAddress).mockResolvedValue({
      ok: true,
    })
    render(
      <AddressActions
        id="a1"
        name="Home"
        isDefault={false}
      />
    )

    await userEvent.click(
      screen.getByRole("button", {
        name: "Make Home the default",
      })
    )

    expect(makeDefaultAddress).toHaveBeenCalledWith("a1")
    expect(refresh).toHaveBeenCalled()
  })

  it("offers no such button for the default itself", () => {
    render(<AddressActions id="a1" name="Home" isDefault />)

    expect(
      screen.queryByRole("button", { name: /the default/ })
    ).not.toBeInTheDocument()
  })

  it("asks before deleting, and deletes only when confirmed", async () => {
    vi.mocked(removeAddress).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(
      <AddressActions
        id="a1"
        name="Home"
        isDefault={false}
      />
    )

    await user.click(
      screen.getByRole("button", { name: "Delete Home" })
    )
    expect(removeAddress).not.toHaveBeenCalled()
    await user.click(
      screen.getByRole("button", { name: "Cancel" })
    )
    expect(removeAddress).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole("button", { name: "Delete Home" })
    )
    await user.click(
      screen.getByRole("button", { name: "Delete address" })
    )

    expect(removeAddress).toHaveBeenCalledWith("a1")
    expect(refresh).toHaveBeenCalled()
  })

  it("says so when the address is already gone", async () => {
    vi.mocked(makeDefaultAddress).mockResolvedValue({
      ok: false,
    })
    render(
      <AddressActions
        id="a1"
        name="Home"
        isDefault={false}
      />
    )

    await userEvent.click(
      screen.getByRole("button", {
        name: "Make Home the default",
      })
    )

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("no longer exists")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AddressActions
        id="a1"
        name="Home"
        isDefault={false}
      />
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
