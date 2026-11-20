import { validateUIMessages, type UIMessage } from "ai"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"

// Every function takes the user's id and filters by it, so someone else's
// conversation is never read or changed: it simply is not found.

/** Conversations kept per shopper; creating one past this drops the oldest. */
export const MAX_CONVERSATIONS = 20

const TITLE_LENGTH = 60

export function titleOf(messages: UIMessage[]) {
  const text = messages
    .find((message) => message.role === "user")
    ?.parts.find((part) => part.type === "text")
  return text?.type === "text"
    ? text.text.trim().slice(0, TITLE_LENGTH) || null
    : null
}

export async function createConversation(userId: string) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({
      data: { userId },
      select: { id: true },
    })
    const stale = await tx.conversation.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: MAX_CONVERSATIONS,
      select: { id: true },
    })
    if (stale.length > 0) {
      await tx.conversation.deleteMany({
        where: { id: { in: stale.map((row) => row.id) } },
      })
    }
    return created.id
  })
}

export async function getConversation(
  userId: string,
  id: string
) {
  const row = await prisma.conversation.findFirst({
    where: { id, userId },
    select: { id: true, title: true, messages: true },
  })
  if (!row) return null
  // stored JSON is checked again on the way out, never trusted as written
  const stored = row.messages as unknown[]
  return {
    ...row,
    messages:
      stored.length === 0
        ? []
        : await validateUIMessages({ messages: stored }),
  }
}

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: { id: true, title: true, updatedAt: true },
  })
}

/** Replaces the messages; false when the conversation is not the user's. */
export async function saveConversation(
  userId: string,
  id: string,
  messages: UIMessage[]
) {
  const { count } = await prisma.conversation.updateMany({
    where: { id, userId },
    data: {
      messages:
        messages as unknown as Prisma.InputJsonValue,
      title: titleOf(messages),
    },
  })
  return count === 1
}

export async function deleteConversation(
  userId: string,
  id: string
) {
  const { count } = await prisma.conversation.deleteMany({
    where: { id, userId },
  })
  return count === 1
}

export async function conversationExists(
  userId: string,
  id: string
) {
  return (
    (await prisma.conversation.count({
      where: { id, userId },
    })) === 1
  )
}
