import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { getSession } from "@/lib/auth/session"
import { createUpload } from "@/lib/storage/uploads"

import { POST } from "./route"

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}))
vi.mock("@/lib/storage/uploads", () => ({
  createUpload: vi.fn(),
}))

const asRole = (role: "ADMIN" | "USER" | null) =>
  vi
    .mocked(getSession)
    .mockResolvedValue(
      role ? ({ user: { role } } as never) : null
    )

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/uploads/presign", {
      method: "POST",
      body: JSON.stringify(body),
    })
  )

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(createUpload).mockResolvedValue({
    key: "products/k.png",
    url: "http://s3/bucket",
    fields: {},
    publicUrl: "http://s3/bucket/products/k.png",
  })
})

describe("POST /api/uploads/presign", () => {
  it("is a 404 for visitors and customers", async () => {
    for (const role of [null, "USER"] as const) {
      asRole(role)
      const response = await post({
        files: [{ type: "image/png", size: 10 }],
      })
      expect(response.status).toBe(404)
    }
    expect(createUpload).not.toHaveBeenCalled()
  })

  it("gives an admin one upload per file", async () => {
    asRole("ADMIN")
    const response = await post({
      files: [
        { type: "image/png", size: 10 },
        { type: "image/webp", size: 20 },
      ],
    })
    expect(response.status).toBe(200)
    expect((await response.json()).uploads).toHaveLength(2)
    expect(createUpload).toHaveBeenCalledWith("image/webp")
  })

  it.each([
    [
      "an unsupported type",
      [{ type: "image/gif", size: 10 }],
    ],
    ["an empty file", [{ type: "image/png", size: 0 }]],
    [
      "a file over the limit",
      [{ type: "image/png", size: 6 * 1024 * 1024 }],
    ],
    ["no files", []],
    [
      "too many files",
      Array(5).fill({ type: "image/png", size: 10 }),
    ],
  ])("refuses %s", async (_name, files) => {
    asRole("ADMIN")
    const response = await post({ files })
    expect(response.status).toBe(400)
    expect(createUpload).not.toHaveBeenCalled()
  })

  it("refuses a body that is not JSON", async () => {
    asRole("ADMIN")
    const response = await POST(
      new Request("http://localhost/api/uploads/presign", {
        method: "POST",
        body: "nope",
      })
    )
    expect(response.status).toBe(400)
  })
})
