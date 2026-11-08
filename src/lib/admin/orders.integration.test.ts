import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import { createCardOrder } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { recordAudit } from "./audit"
import {
  ADMIN_ORDERS_PAGE_SIZE,
  getAdminOrder,
  listAdminOrders,
} from "./orders"

beforeEach(resetDb)

/** `count` bare orders, a second apart, the first the oldest. */
async function bulkOrders(count: number) {
  const base = Date.now() - count * 1000
  await prisma.order.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      number: `CS-BULK${String(i).padStart(4, "0")}`,
      paymentMethod: "CASH_ON_DELIVERY" as const,
      subtotalCents: 1000,
      shippingCents: 500,
      totalCents: 1500,
      idempotencyKey: crypto.randomUUID(),
      shipName: `Customer ${i}`,
      shipPhone: "+12025550123",
      shipLine1: "1 Main St",
      shipCity: "Austin",
      shipCountry: "US",
      // two orders share each time, which the id must break
      placedAt: new Date(base + Math.floor(i / 2) * 1000),
    })),
  })
}

describe("listAdminOrders", () => {
  it("lists the newest first and pages without losing or repeating an order", async () => {
    const total = ADMIN_ORDERS_PAGE_SIZE + 7
    await bulkOrders(total)

    const first = await listAdminOrders({ page: 1 })
    const second = await listAdminOrders({ page: 2 })

    expect(first).toMatchObject({ total, pageCount: 2 })
    expect(first.orders).toHaveLength(
      ADMIN_ORDERS_PAGE_SIZE
    )
    expect(second.orders).toHaveLength(7)
    const ids = [...first.orders, ...second.orders].map(
      (o) => o.id
    )
    expect(new Set(ids).size).toBe(total)
    const times = first.orders.map((o) =>
      o.placedAt.getTime()
    )
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it("filters by status", async () => {
    await bulkOrders(5)
    await prisma.order.updateMany({
      where: {
        number: { in: ["CS-BULK0000", "CS-BULK0001"] },
      },
      data: { status: "SHIPPED" },
    })

    const shipped = await listAdminOrders({
      status: "SHIPPED",
      page: 1,
    })
    const pending = await listAdminOrders({
      status: "PENDING",
      page: 1,
    })

    expect(shipped.total).toBe(2)
    expect(pending.total).toBe(3)
    expect(
      shipped.orders.every((o) => o.status === "SHIPPED")
    ).toBe(true)
  })

  it("finds an order by part of its number, the recipient's name or the customer's email", async () => {
    const { order, user } = await createCardOrder()
    await bulkOrders(4)
    await prisma.order.update({
      where: { id: order.id },
      data: { shipName: "Grace Hopper" },
    })

    const byNumber = await listAdminOrders({
      q: order.number.slice(3, 7).toLowerCase(),
      page: 1,
    })
    const byName = await listAdminOrders({
      q: "grace hop",
      page: 1,
    })
    const byEmail = await listAdminOrders({
      q: user.email.toUpperCase(),
      page: 1,
    })

    for (const found of [byNumber, byName, byEmail]) {
      expect(found.orders.map((o) => o.id)).toContain(
        order.id
      )
    }
    expect(byName.total).toBe(1)
    expect(byEmail.total).toBe(1)
  })

  it("treats % and _ in a search as the characters they are", async () => {
    await bulkOrders(3)

    expect(
      (await listAdminOrders({ q: "%", page: 1 })).total
    ).toBe(0)
    expect(
      (await listAdminOrders({ q: "Customer _", page: 1 }))
        .total
    ).toBe(0)
    expect(
      (await listAdminOrders({ q: "Customer 1", page: 1 }))
        .total
    ).toBe(1)
  })

  it("combines a status and a search", async () => {
    await bulkOrders(4)
    await prisma.order.update({
      where: { number: "CS-BULK0002" },
      data: { status: "CONFIRMED" },
    })

    const found = await listAdminOrders({
      status: "CONFIRMED",
      q: "Customer",
      page: 1,
    })
    const none = await listAdminOrders({
      status: "CONFIRMED",
      q: "Customer 0",
      page: 1,
    })

    expect(found.total).toBe(1)
    expect(none.total).toBe(0)
  })

  it("has one empty page when there are no orders", async () => {
    expect(
      await listAdminOrders({ page: 1 })
    ).toMatchObject({
      total: 0,
      pageCount: 1,
      orders: [],
    })
  })
})

describe("getAdminOrder", () => {
  it("returns the order with its customer, items and the history of changes to it", async () => {
    const { order, user } = await createCardOrder(2)
    await prisma.$transaction(async (tx) => {
      await recordAudit(tx, {
        actor: null,
        action: "order.confirm",
        targetType: "order",
        targetId: order.id,
        summary: "first",
      })
      await recordAudit(tx, {
        actor: null,
        action: "order.ship",
        targetType: "order",
        targetId: order.id,
        summary: "second",
      })
      // another order's history must not appear
      await recordAudit(tx, {
        actor: null,
        action: "order.ship",
        targetType: "order",
        targetId: "someone-else",
        summary: "other",
      })
    })

    const found = await getAdminOrder(order.number)

    expect(found?.user).toMatchObject({ email: user.email })
    expect(found?.items).toHaveLength(1)
    expect(found?.history.map((h) => h.summary)).toEqual([
      "first",
      "second",
    ])
  })

  it("is null for an order that does not exist", async () => {
    expect(await getAdminOrder("CS-NOSUCH22")).toBeNull()
  })

  it("keeps the order when the customer's account is gone", async () => {
    const { order, user } = await createCardOrder()
    await prisma.user.delete({ where: { id: user.id } })

    expect(
      (await getAdminOrder(order.number))?.user
    ).toBeNull()
  })
})
