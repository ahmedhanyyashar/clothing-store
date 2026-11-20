import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { MOCK_REPLY } from "@/lib/assistant/model"
import { VISITOR_LIMIT } from "@/lib/assistant/request"
import { prisma } from "@/lib/db/client"
import { createUser } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { POST } from "./route"

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}))
vi.mock("@/lib/auth/session", () => ({ getSession }))

const ask = (body: unknown, ip = "203.0.113.1") =>
  POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: JSON.stringify(body),
    })
  )

const hello = (text = "Any hoodies?") => ({
  id: "m1",
  role: "user",
  parts: [{ type: "text", text }],
})

beforeEach(async () => {
  await resetDb()
  getSession.mockResolvedValue(null)
})

describe("POST /api/chat", () => {
  it("answers a visitor and stores nothing", async () => {
    const response = await ask({ messages: [hello()] })

    expect(response.status).toBe(200)
    expect(await response.text()).toContain(MOCK_REPLY)
    expect(await prisma.conversation.count()).toBe(0)
  })

  it("keeps a signed-in shopper's chat, with the reply", async () => {
    const user = await createUser()
    getSession.mockResolvedValue({ user })

    const response = await ask({ messages: [hello()] })
    await response.text()

    const id = response.headers.get("x-conversation-id")!
    const saved =
      await prisma.conversation.findUniqueOrThrow({
        where: { id },
      })
    expect(saved.userId).toBe(user.id)
    expect(saved.title).toBe("Any hoodies?")
    expect(JSON.stringify(saved.messages)).toContain(
      MOCK_REPLY
    )
  })

  it("does not continue someone else's conversation", async () => {
    const owner = await createUser()
    const other = await createUser()
    const theirs = await prisma.conversation.create({
      data: { userId: owner.id },
    })
    getSession.mockResolvedValue({ user: other })

    const response = await ask({
      id: theirs.id,
      messages: [hello()],
    })

    expect(response.status).toBe(404)
  })

  it("refuses a message that is too long and a malformed request", async () => {
    const long = await ask({
      messages: [hello("x".repeat(1001))],
    })
    const bad = await ask({ messages: "nope" })

    expect(long.status).toBe(400)
    expect(bad.status).toBe(400)
  })

  it("limits a visitor by address", async () => {
    for (let i = 0; i < VISITOR_LIMIT; i++) {
      const response = await ask({ messages: [hello()] })
      await response.text()
      expect(response.status).toBe(200)
    }

    expect(
      (await ask({ messages: [hello()] })).status
    ).toBe(429)
    expect(
      (await ask({ messages: [hello()] }, "203.0.113.2"))
        .status
    ).toBe(200)
  })
})
