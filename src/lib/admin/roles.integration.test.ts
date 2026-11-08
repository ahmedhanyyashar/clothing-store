import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import { createUser } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { grantAdmin, revokeAdmin } from "./roles"

beforeEach(resetDb)

const roleOf = async (id: string) =>
  (await prisma.user.findUniqueOrThrow({ where: { id } }))
    .role

describe("grantAdmin", () => {
  it("makes a verified account an admin and records it", async () => {
    const user = await createUser({
      email: "ada@example.com",
    })

    expect(await grantAdmin("ada@example.com")).toBe(
      "granted"
    )

    expect(await roleOf(user.id)).toBe("ADMIN")
    const entry = await prisma.auditLog.findFirstOrThrow()
    expect(entry).toMatchObject({
      actorId: null,
      actorLabel: "operator",
      action: "admin.grant",
      targetType: "user",
      targetId: user.id,
    })
    expect(entry.summary).toContain("ada@example.com")
  })

  it("ignores case and surrounding spaces in the address", async () => {
    const user = await createUser({
      email: "ada@example.com",
    })

    expect(await grantAdmin("  ADA@Example.com ")).toBe(
      "granted"
    )
    expect(await roleOf(user.id)).toBe("ADMIN")
  })

  it("does nothing, and records nothing, for an account that is already an admin", async () => {
    await createUser({ email: "ada@example.com" })
    await grantAdmin("ada@example.com")

    expect(await grantAdmin("ada@example.com")).toBe(
      "already-admin"
    )
    expect(await prisma.auditLog.count()).toBe(1)
  })

  it("refuses an account that has not verified its address", async () => {
    const user = await createUser({
      email: "ada@example.com",
    })
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: false },
    })

    expect(await grantAdmin("ada@example.com")).toBe(
      "not-verified"
    )
    expect(await roleOf(user.id)).toBe("USER")
    expect(await prisma.auditLog.count()).toBe(0)
  })

  it("refuses an address with no account", async () => {
    expect(await grantAdmin("nobody@example.com")).toBe(
      "not-found"
    )
    expect(await prisma.auditLog.count()).toBe(0)
  })
})

describe("revokeAdmin", () => {
  async function admins(...emails: string[]) {
    const users = []
    for (const email of emails) {
      users.push(await createUser({ email }))
      await grantAdmin(email)
    }
    return users
  }

  it("takes the role away and records it", async () => {
    const [ada] = await admins(
      "ada@example.com",
      "bob@example.com"
    )

    expect(await revokeAdmin("ada@example.com")).toBe(
      "revoked"
    )

    expect(await roleOf(ada.id)).toBe("USER")
    const entries = await prisma.auditLog.findMany({
      where: { action: "admin.revoke" },
    })
    expect(entries).toHaveLength(1)
    expect(entries[0].summary).toContain("ada@example.com")
  })

  it("refuses to remove the only admin", async () => {
    const [ada] = await admins("ada@example.com")

    expect(await revokeAdmin("ada@example.com")).toBe(
      "last-admin"
    )

    expect(await roleOf(ada.id)).toBe("ADMIN")
  })

  it("removes the only admin when forced", async () => {
    const [ada] = await admins("ada@example.com")

    expect(
      await revokeAdmin("ada@example.com", { force: true })
    ).toBe("revoked")
    expect(await roleOf(ada.id)).toBe("USER")
  })

  it("cannot take the shop's last two admins at the same moment", async () => {
    await admins("ada@example.com", "bob@example.com")

    const results = await Promise.all([
      revokeAdmin("ada@example.com"),
      revokeAdmin("bob@example.com"),
    ])

    expect([...results].sort()).toEqual([
      "last-admin",
      "revoked",
    ])
    expect(
      await prisma.user.count({ where: { role: "ADMIN" } })
    ).toBe(1)
  })

  it("does nothing for someone who is not an admin, or does not exist", async () => {
    await createUser({ email: "ada@example.com" })

    expect(await revokeAdmin("ada@example.com")).toBe(
      "not-admin"
    )
    expect(await revokeAdmin("nobody@example.com")).toBe(
      "not-found"
    )
  })
})
