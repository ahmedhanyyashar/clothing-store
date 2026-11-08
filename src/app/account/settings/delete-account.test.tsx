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

import { DeleteAccount } from "./delete-account"

const push = vi.fn()
const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}))
vi.mock("@/lib/auth/client", () => ({
  authClient: { deleteUser: vi.fn() },
}))

async function openDialog() {
  const user = userEvent.setup()
  await user.click(
    screen.getByRole("button", { name: "Delete account" })
  )
  return user
}

const confirm = (
  user: ReturnType<typeof userEvent.setup>
) =>
  user.click(
    screen.getByRole("button", {
      name: "Delete my account",
    })
  )

beforeEach(() => vi.resetAllMocks())

describe("DeleteAccount", () => {
  it("asks for confirmation before anything is deleted", async () => {
    render(<DeleteAccount withPassword />)

    expect(
      screen.queryByRole("alertdialog")
    ).not.toBeInTheDocument()
    await openDialog()

    expect(
      screen.getByRole("alertdialog", {
        name: "Delete your account?",
      })
    ).toBeInTheDocument()
    expect(authClient.deleteUser).not.toHaveBeenCalled()
  })

  it("needs the password, then deletes and leaves for the home page", async () => {
    vi.mocked(authClient.deleteUser).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    render(<DeleteAccount withPassword />)
    const user = await openDialog()

    await confirm(user)
    expect(
      await screen.findByText("Enter your password")
    ).toBeInTheDocument()
    expect(authClient.deleteUser).not.toHaveBeenCalled()

    await user.type(
      screen.getByLabelText(
        "Enter your password to confirm"
      ),
      "my-password-123"
    )
    await confirm(user)

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith("/")
    )
    expect(authClient.deleteUser).toHaveBeenCalledWith({
      password: "my-password-123",
    })
    expect(refresh).toHaveBeenCalled()
  })

  it("keeps the account and says why when the password is wrong", async () => {
    vi.mocked(authClient.deleteUser).mockResolvedValue({
      data: null,
      error: { message: "Invalid password" },
    } as never)
    render(<DeleteAccount withPassword />)
    const user = await openDialog()

    await user.type(
      screen.getByLabelText(
        "Enter your password to confirm"
      ),
      "wrong"
    )
    await confirm(user)

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Invalid password")
    expect(push).not.toHaveBeenCalled()
  })

  it("asks for no password from someone who signs in with Google", async () => {
    vi.mocked(authClient.deleteUser).mockResolvedValue({
      data: {},
      error: null,
    } as never)
    render(<DeleteAccount withPassword={false} />)
    const user = await openDialog()

    expect(
      screen.queryByLabelText(
        "Enter your password to confirm"
      )
    ).not.toBeInTheDocument()
    await confirm(user)

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith("/")
    )
    expect(authClient.deleteUser).toHaveBeenCalledWith({})
  })

  it("has no accessibility violations, closed or open", async () => {
    const { container } = render(
      <DeleteAccount withPassword />
    )
    expect(await axe(container)).toHaveNoViolations()

    await openDialog()
    expect(await axe(document.body)).toHaveNoViolations()
  })
})
