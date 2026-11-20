import type { UIMessage } from "ai"
import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import { createUser } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  MAX_CONVERSATIONS,
  saveConversation,
} from "./conversations"

const say = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
})

beforeEach(resetDb)

describe("conversations", () => {
  it("saves messages and titles the chat after the first one", async () => {
    const user = await createUser()
    const id = await createConversation(user.id)

    expect(
      await saveConversation(user.id, id, [
        say("Any hoodies?"),
      ])
    ).toBe(true)

    const found = await getConversation(user.id, id)
    expect(found?.title).toBe("Any hoodies?")
    expect(found?.messages).toHaveLength(1)
    expect(await listConversations(user.id)).toHaveLength(1)
  })

  it("never shows, changes or deletes someone else's conversation", async () => {
    const owner = await createUser()
    const other = await createUser()
    const id = await createConversation(owner.id)

    expect(await getConversation(other.id, id)).toBeNull()
    expect(
      await saveConversation(other.id, id, [say("hi")])
    ).toBe(false)
    expect(await deleteConversation(other.id, id)).toBe(
      false
    )
    expect(await listConversations(other.id)).toEqual([])
    expect(
      await getConversation(owner.id, id)
    ).not.toBeNull()
  })

  it("keeps only the newest conversations", async () => {
    const user = await createUser()
    const first = await createConversation(user.id)
    for (let i = 0; i < MAX_CONVERSATIONS; i++) {
      await createConversation(user.id)
    }

    const kept = await listConversations(user.id)
    expect(kept).toHaveLength(MAX_CONVERSATIONS)
    expect(kept.map((row) => row.id)).not.toContain(first)
  })

  it("goes with the account", async () => {
    const user = await createUser()
    await createConversation(user.id)

    await prisma.user.delete({ where: { id: user.id } })

    expect(await prisma.conversation.count()).toBe(0)
  })
})
