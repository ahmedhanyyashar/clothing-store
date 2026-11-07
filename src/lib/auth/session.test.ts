import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { auth } from "@/lib/auth/auth"

import { requireRole, requireUser } from "./session"

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}))
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))
// like the real ones, these end the request by throwing
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found")
  }),
}))

function signedInAs(role: "USER" | "ADMIN") {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: {
      id: "u1",
      name: "Ada",
      email: "ada@example.com",
      role,
    },
  } as never)
}

describe("requireUser", () => {
  beforeEach(() => {
    vi.mocked(auth.api.getSession).mockReset()
  })

  it("returns the signed-in user", async () => {
    signedInAs("USER")

    await expect(
      requireUser("/account")
    ).resolves.toMatchObject({
      email: "ada@example.com",
    })
  })

  it("sends a signed-out visitor to sign in, remembering where they were going", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(
      requireUser("/orders?page=2")
    ).rejects.toThrow(
      "redirect:/sign-in?redirect=%2Forders%3Fpage%3D2"
    )
  })
})

describe("requireRole", () => {
  beforeEach(() => {
    vi.mocked(auth.api.getSession).mockReset()
  })

  it("lets a user with the role through", async () => {
    signedInAs("ADMIN")

    await expect(
      requireRole("ADMIN", "/admin")
    ).resolves.toMatchObject({
      role: "ADMIN",
    })
  })

  it("answers 404 to a signed-in user without the role", async () => {
    signedInAs("USER")

    await expect(
      requireRole("ADMIN", "/admin")
    ).rejects.toThrow("not-found")
  })

  it("sends a signed-out visitor to sign in first", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(
      requireRole("ADMIN", "/admin")
    ).rejects.toThrow("redirect:/sign-in")
  })
})
