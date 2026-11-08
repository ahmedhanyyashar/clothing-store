import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import { createUser } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import {
  actorOf,
  AUDIT_PAGE_SIZE,
  listAudit,
  recordAudit,
} from "./audit"

beforeEach(resetDb)

const entry = (n: number) => ({
  actor: null,
  action: "order.ship",
  targetType: "order" as const,
  targetId: `order-${n}`,
  summary: `entry ${n}`,
})

describe("recordAudit", () => {
  it("names the admin as they were at the time", async () => {
    const admin = await createUser({
      name: "Ada Lovelace",
      email: "ada@example.com",
    })

    await prisma.$transaction((tx) =>
      recordAudit(tx, {
        ...entry(1),
        actor: actorOf(admin),
      })
    )

    const saved = await prisma.auditLog.findFirstOrThrow()
    expect(saved).toMatchObject({
      actorId: admin.id,
      actorLabel: "Ada Lovelace <ada@example.com>",
    })
  })

  it("keeps the entry, with the name, after the account is deleted", async () => {
    const admin = await createUser({
      name: "Ada",
      email: "ada@example.com",
    })
    await prisma.$transaction((tx) =>
      recordAudit(tx, {
        ...entry(1),
        actor: actorOf(admin),
      })
    )

    await prisma.user.delete({ where: { id: admin.id } })

    const saved = await prisma.auditLog.findFirstOrThrow()
    expect(saved.actorId).toBeNull()
    expect(saved.actorLabel).toBe("Ada <ada@example.com>")
  })

  it("is saved with the change it describes, or not at all", async () => {
    const user = await createUser()

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { name: "New" },
        })
        await recordAudit(tx, entry(1))
        throw new Error("the change failed")
      })
    ).rejects.toThrow()

    expect(await prisma.auditLog.count()).toBe(0)
    expect(
      (
        await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
        })
      ).name
    ).not.toBe("New")
  })
})

describe("listAudit", () => {
  it("lists the newest first and pages without losing or repeating an entry", async () => {
    const total = AUDIT_PAGE_SIZE + 5
    const base = Date.now()
    await prisma.auditLog.createMany({
      data: Array.from({ length: total }, (_, i) => ({
        actorLabel: "operator",
        action: "order.ship",
        targetType: "order",
        targetId: `order-${i}`,
        summary: `entry ${i}`,
        // two entries share a time, which the id must break
        createdAt: new Date(
          base + Math.floor(i / 2) * 1000
        ),
      })),
    })

    const first = await listAudit(1)
    const second = await listAudit(2)

    expect(first.total).toBe(total)
    expect(first.pageCount).toBe(2)
    expect(first.entries).toHaveLength(AUDIT_PAGE_SIZE)
    expect(second.entries).toHaveLength(5)
    const ids = [...first.entries, ...second.entries].map(
      (e) => e.id
    )
    expect(new Set(ids).size).toBe(total)
    // newest first
    const times = first.entries.map((e) =>
      e.createdAt.getTime()
    )
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it("has one empty page when nothing was recorded", async () => {
    expect(await listAudit(1)).toMatchObject({
      total: 0,
      pageCount: 1,
    })
  })
})
