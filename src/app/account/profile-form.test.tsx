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

import { authClient } from "@/lib/auth/client"

import { ProfileForm } from "./profile-form"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))
vi.mock("@/lib/auth/client", () => ({
  authClient: { updateUser: vi.fn() },
}))

beforeEach(() => vi.resetAllMocks())

describe("ProfileForm", () => {
  it("starts with the current name and nothing to save", () => {
    render(<ProfileForm name="Ada Lovelace" />)

    expect(screen.getByLabelText("Name")).toHaveValue(
      "Ada Lovelace"
    )
    expect(
      screen.getByRole("button", { name: "Save changes" })
    ).toBeDisabled()
  })

  it("saves the new name and refreshes the page", async () => {
    vi.mocked(authClient.updateUser).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    const user = userEvent.setup()
    render(<ProfileForm name="Ada Lovelace" />)

    await user.clear(screen.getByLabelText("Name"))
    await user.type(
      screen.getByLabelText("Name"),
      "  Ada King "
    )
    await user.click(
      screen.getByRole("button", { name: "Save changes" })
    )

    expect(
      await screen.findByRole("status")
    ).toHaveTextContent("Saved.")
    // the schema trims before the name is sent
    expect(authClient.updateUser).toHaveBeenCalledWith({
      name: "Ada King",
    })
    expect(refresh).toHaveBeenCalled()
    expect(
      screen.getByRole("button", { name: "Save changes" })
    ).toBeDisabled()
  })

  it("refuses a name that is too short", async () => {
    const user = userEvent.setup()
    render(<ProfileForm name="Ada Lovelace" />)

    await user.clear(screen.getByLabelText("Name"))
    await user.type(screen.getByLabelText("Name"), "A")
    await user.click(
      screen.getByRole("button", { name: "Save changes" })
    )

    expect(
      await screen.findByText(
        "Name must be at least 2 characters"
      )
    ).toBeInTheDocument()
    expect(authClient.updateUser).not.toHaveBeenCalled()
  })

  it("shows the server's message when saving fails", async () => {
    vi.mocked(authClient.updateUser).mockResolvedValue({
      data: null,
      error: { message: "Try later" },
    } as never)
    const user = userEvent.setup()
    render(<ProfileForm name="Ada Lovelace" />)

    await user.type(screen.getByLabelText("Name"), "x")
    await user.click(
      screen.getByRole("button", { name: "Save changes" })
    )

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Try later")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ProfileForm name="Ada" />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
