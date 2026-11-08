import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import {
  createCardOrder,
  createProduct,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import {
  getDashboard,
  LOW_STOCK_AT,
  REVENUE_DAYS,
} from "./dashboard"

// a fixed "now": noon UTC on 8 November 2026
const NOW = new Date("2026-11-08T12:00:00Z")
const at = (iso: string) => new Date(iso)

beforeEach(resetDb)

/** A card order of $40.00 (2 × $20.00) paid at `paidAt`, or not paid at all. */
async function paidOrder(
  paidAt: Date | null,
  status = "PAID"
) {
  const { order } = await createCardOrder(2)
  await prisma.order.update({
    where: { id: order.id },
    data:
      paidAt === null
        ? {}
        : {
            paymentStatus: status as "PAID",
            paidAt,
            status: "CONFIRMED",
          },
  })
  return order
}

describe("revenue", () => {
  it("counts paid orders on the day they were paid, in UTC", async () => {
    const before = await paidOrder(
      at("2026-11-07T23:59:59Z")
    )
    const after = await paidOrder(
      at("2026-11-08T00:00:00Z")
    )

    const { days, revenueCents } = await getDashboard(NOW)

    const byDate = Object.fromEntries(
      days.map((d) => [d.date, d.cents])
    )
    expect(byDate["2026-11-07"]).toBe(before.totalCents)
    expect(byDate["2026-11-08"]).toBe(after.totalCents)
    expect(revenueCents).toBe(
      before.totalCents + after.totalCents
    )
  })

  it("covers exactly the last 30 days, ending today", async () => {
    const { days } = await getDashboard(NOW)

    expect(days).toHaveLength(REVENUE_DAYS)
    expect(days[0].date).toBe("2026-10-10")
    expect(days.at(-1)!.date).toBe("2026-11-08")
  })

  it("keeps older payments out of the 30 days but in the total", async () => {
    const old = await paidOrder(at("2026-10-09T23:00:00Z"))
    const edge = await paidOrder(at("2026-10-10T00:00:00Z"))

    const dashboard = await getDashboard(NOW)

    expect(dashboard.revenueCents).toBe(edge.totalCents)
    expect(dashboard.allTimeRevenueCents).toBe(
      old.totalCents + edge.totalCents
    )
  })

  it("leaves out orders that are unpaid, failed or refunded", async () => {
    const paid = await paidOrder(at("2026-11-08T08:00:00Z"))
    await paidOrder(null)
    const refunded = await paidOrder(
      at("2026-11-08T09:00:00Z")
    )
    await prisma.order.update({
      where: { id: refunded.id },
      data: { paymentStatus: "REFUNDED" },
    })
    const failed = await paidOrder(
      at("2026-11-08T10:00:00Z")
    )
    await prisma.order.update({
      where: { id: failed.id },
      data: { paymentStatus: "FAILED" },
    })

    const dashboard = await getDashboard(NOW)

    expect(dashboard.revenueCents).toBe(paid.totalCents)
    expect(dashboard.allTimeRevenueCents).toBe(
      paid.totalCents
    )
  })

  it("is zero, and not an error, when nothing was paid", async () => {
    const dashboard = await getDashboard(NOW)

    expect(dashboard.revenueCents).toBe(0)
    expect(dashboard.allTimeRevenueCents).toBe(0)
    expect(dashboard.days.every((d) => d.cents === 0)).toBe(
      true
    )
  })
})

describe("counts", () => {
  it("counts orders waiting, customers (not admins) and products", async () => {
    await createCardOrder()
    const done = await createCardOrder()
    await prisma.order.update({
      where: { id: done.order.id },
      data: { status: "DELIVERED" },
    })
    const admin = await createUser()
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: "ADMIN" },
    })

    const dashboard = await getDashboard(NOW)

    expect(dashboard.waiting).toBe(1)
    // the two buyers; the admin is not a customer
    expect(dashboard.customers).toBe(2)
    expect(dashboard.products).toBe(2)
  })
})

describe("best sellers", () => {
  async function orderOf(
    name: string,
    quantity: number,
    placedAt = NOW
  ) {
    const { order, product } =
      await createCardOrder(quantity)
    await prisma.orderItem.updateMany({
      where: { orderId: order.id },
      data: { name },
    })
    await prisma.order.update({
      where: { id: order.id },
      data: { placedAt },
    })
    return { order, product }
  }

  it("ranks by units sold, with a name as the tie-break", async () => {
    await orderOf("Beta", 3)
    await orderOf("Alpha", 3)
    await orderOf("Gamma", 5)

    const { bestSellers } = await getDashboard(NOW)

    expect(bestSellers).toEqual([
      { name: "Gamma", units: 5 },
      { name: "Alpha", units: 3 },
      { name: "Beta", units: 3 },
    ])
  })

  it("adds up the same product across orders, and ignores cancelled and old ones", async () => {
    await orderOf("Tee", 2)
    await orderOf("Tee", 1)
    const cancelled = await orderOf("Tee", 9)
    await prisma.order.update({
      where: { id: cancelled.order.id },
      data: { status: "CANCELLED" },
    })
    await orderOf("Tee", 7, at("2026-09-01T00:00:00Z"))

    const { bestSellers } = await getDashboard(NOW)

    expect(bestSellers).toEqual([{ name: "Tee", units: 3 }])
  })

  it("still names a product that was deleted since", async () => {
    const { product } = await orderOf("Old Tee", 2)
    await prisma.product.delete({
      where: { id: product.id },
    })

    const { bestSellers } = await getDashboard(NOW)

    expect(bestSellers).toEqual([
      { name: "Old Tee", units: 2 },
    ])
  })

  it("lists at most five", async () => {
    for (let i = 0; i < 7; i++)
      await orderOf(`Item ${i}`, 1)

    expect(
      (await getDashboard(NOW)).bestSellers
    ).toHaveLength(5)
  })
})

describe("running low", () => {
  it("lists sizes at or under the limit, the emptiest first, with their product", async () => {
    await createProduct({
      name: "Tee",
      sizes: [
        { label: "S", stock: 0 },
        { label: "M", stock: LOW_STOCK_AT },
        { label: "L", stock: LOW_STOCK_AT + 1 },
      ],
    })

    const { lowStock } = await getDashboard(NOW)

    expect(
      lowStock.map((s) => [
        s.product.name,
        s.label,
        s.stock,
      ])
    ).toEqual([
      ["Tee", "S", 0],
      ["Tee", "M", LOW_STOCK_AT],
    ])
  })

  it("shows ten at most", async () => {
    await createProduct({
      sizes: Array.from({ length: 12 }, (_, i) => ({
        label: `S${i}`,
        stock: 1,
      })),
    })

    expect((await getDashboard(NOW)).lowStock).toHaveLength(
      10
    )
  })
})
