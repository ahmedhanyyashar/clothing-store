import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import { createProduct, createUser } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import {
  DEMO_ADMIN_EMAIL,
  DEMO_CUSTOMER_EMAIL,
  DEMO_DOMAIN,
  seedDemo,
} from "../../prisma/demo"

beforeEach(async () => {
  await resetDb()
  for (let i = 0; i < 4; i++)
    await createProduct({
      name: `Product ${i}`,
      priceCents: 2000 + i * 1500,
      sizes: [
        { label: "S", stock: 5 },
        { label: "M", stock: 5 },
      ],
    })
})

describe("the demo seed", () => {
  it("makes an admin and a customer who can sign in, and a history of orders", async () => {
    await seedDemo()

    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: DEMO_ADMIN_EMAIL },
      include: { accounts: true },
    })
    expect(admin.role).toBe("ADMIN")
    expect(admin.emailVerified).toBe(true)
    expect(admin.accounts[0]).toMatchObject({
      providerId: "credential",
    })
    expect(admin.accounts[0].password).toBeTruthy()
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: DEMO_CUSTOMER_EMAIL },
    })
    expect(customer.role).toBe("USER")

    expect(await prisma.order.count()).toBe(72)
    const states = await prisma.order.groupBy({
      by: ["status"],
      _count: true,
    })
    expect(states.map((s) => s.status).sort()).toEqual([
      "CANCELLED",
      "CONFIRMED",
      "DELIVERED",
      "PENDING",
      "SHIPPED",
    ])
  })

  it("keeps every order consistent with the rules of the shop", async () => {
    await seedDemo()
    const orders = await prisma.order.findMany({
      include: { items: true },
    })

    for (const order of orders) {
      const subtotal = order.items.reduce(
        (sum, i) => sum + i.unitPriceCents * i.quantity,
        0
      )
      expect(order.subtotalCents).toBe(subtotal)
      expect(order.totalCents).toBe(
        order.subtotalCents + order.shippingCents
      )
      expect(order.shippingCents).toBe(
        subtotal >= 7500 ? 0 : 500
      )
      // money only moves with a date on it
      if (order.paymentStatus === "PAID")
        expect(order.paidAt).not.toBeNull()
      if (order.paymentStatus === "REFUNDED") {
        expect(order.refundedAt).not.toBeNull()
        expect(order.paymentMethod).toBe("CARD")
        expect(order.status).toBe("CANCELLED")
      }
      if (order.status === "CANCELLED")
        expect(order.cancelledAt).not.toBeNull()
      // cash is collected on delivery, never before
      if (
        order.paymentMethod === "CASH_ON_DELIVERY" &&
        order.status !== "DELIVERED"
      )
        expect(order.paymentStatus).toBe("PENDING")
      // an unpaid card order is not left waiting for days
      if (
        order.paymentMethod === "CARD" &&
        order.paymentStatus === "PENDING"
      )
        expect(
          Date.now() - order.placedAt.getTime()
        ).toBeLessThan(2 * 24 * 60 * 60 * 1000)
    }
  })

  it("logs what happened to the orders, in the admin's name", async () => {
    await seedDemo()

    const delivered = await prisma.order.findFirstOrThrow({
      where: { status: "DELIVERED" },
    })
    const log = await prisma.auditLog.findMany({
      where: { targetId: delivered.id },
      orderBy: { createdAt: "asc" },
    })
    expect(log.map((l) => l.action)).toContain(
      "order.deliver"
    )
    expect(log[0].actorLabel).toContain(DEMO_ADMIN_EMAIL)
    expect(
      await prisma.auditLog.count({
        where: { action: "admin.grant" },
      })
    ).toBe(1)
  })

  it("can run again without doubling anything, and leaves other accounts alone", async () => {
    const other = await createUser({
      email: "someone@example.com",
    })

    await seedDemo()
    await seedDemo()

    expect(await prisma.order.count()).toBe(72)
    expect(
      await prisma.user.count({
        where: { email: { endsWith: DEMO_DOMAIN } },
      })
    ).toBe(13)
    expect(
      await prisma.user.findUnique({
        where: { id: other.id },
      })
    ).not.toBeNull()
  })

  it("refuses to run without a catalog", async () => {
    await prisma.product.deleteMany()

    await expect(seedDemo()).rejects.toThrow(
      "Seed the catalog"
    )
  })
})
