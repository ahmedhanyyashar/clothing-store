import { prisma } from "@/lib/db/client"

export const REVENUE_DAYS = 30
/** A size with this many left or fewer is listed as running low. */
export const LOW_STOCK_AT = 3

export type RevenueDay = {
  /** YYYY-MM-DD, in UTC */
  date: string
  cents: number
}

const dayKey = (date: Date) =>
  date.toISOString().slice(0, 10)

/** Midnight UTC, `days - 1` days before today. */
function firstDay(now: Date, days: number) {
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start
}

/**
 * Money counts on the day it was paid, not the day the order was placed, and
 * an order that was refunded is no longer money earned. Days are UTC days, on
 * the server and in the database alike, so a payment never lands on two days.
 */
async function revenueByDay(
  now: Date
): Promise<RevenueDay[]> {
  const start = firstDay(now, REVENUE_DAYS)
  const rows = await prisma.$queryRaw<
    { day: string; cents: number }[]
  >`
    SELECT to_char("paidAt", 'YYYY-MM-DD') AS day,
           SUM("totalCents")::int AS cents
    FROM "order"
    WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${start}
    GROUP BY 1
  `
  const byDay = new Map(
    rows.map((row) => [row.day, row.cents])
  )

  return Array.from(
    { length: REVENUE_DAYS },
    (_, index) => {
      const date = new Date(start)
      date.setUTCDate(date.getUTCDate() + index)
      return {
        date: dayKey(date),
        cents: byDay.get(dayKey(date)) ?? 0,
      }
    }
  )
}

export async function getDashboard(now = new Date()) {
  const since = firstDay(now, REVENUE_DAYS)

  const [
    days,
    allTime,
    waiting,
    customers,
    products,
    bestSellers,
    lowStock,
  ] = await Promise.all([
    revenueByDay(now),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalCents: true },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.product.count(),
    // units sold in the period, from the copies on the orders, so a product
    // that has since been renamed or deleted still counts under its old name
    prisma.orderItem.groupBy({
      by: ["name"],
      where: {
        order: {
          status: { not: "CANCELLED" },
          placedAt: { gte: since },
        },
      },
      _sum: { quantity: true },
      orderBy: [
        { _sum: { quantity: "desc" } },
        { name: "asc" },
      ],
      take: 5,
    }),
    prisma.productSize.findMany({
      where: { stock: { lte: LOW_STOCK_AT } },
      orderBy: [{ stock: "asc" }, { id: "asc" }],
      take: 10,
      select: {
        id: true,
        label: true,
        stock: true,
        product: { select: { id: true, name: true } },
      },
    }),
  ])

  return {
    days,
    revenueCents: days.reduce(
      (sum, day) => sum + day.cents,
      0
    ),
    allTimeRevenueCents: allTime._sum.totalCents ?? 0,
    waiting,
    customers,
    products,
    bestSellers: bestSellers.map((row) => ({
      name: row.name,
      units: row._sum.quantity ?? 0,
    })),
    lowStock,
  }
}
