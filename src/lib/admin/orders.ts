import type { Prisma } from "@/generated/prisma/client"
import type { OrderStatus } from "@/generated/prisma/enums"
import { prisma } from "@/lib/db/client"
import { escapeLike } from "@/lib/db/like"

export const ADMIN_ORDERS_PAGE_SIZE = 20

export type AdminOrderFilter = {
  status?: OrderStatus
  /** Matches the order number, the recipient's name or the customer's email. */
  q?: string
  page: number
}

function where({
  status,
  q,
}: AdminOrderFilter): Prisma.OrderWhereInput {
  const text = q?.trim()
  const contains = (value: string) => ({
    contains: escapeLike(value),
    mode: "insensitive" as const,
  })
  return {
    status,
    ...(text
      ? {
          OR: [
            { number: contains(text) },
            { shipName: contains(text) },
            { user: { email: contains(text) } },
          ],
        }
      : {}),
  }
}

export async function listAdminOrders(
  filter: AdminOrderFilter
) {
  const condition = where(filter)
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: condition,
      // the id breaks ties, so an order never appears on two pages or on none
      orderBy: [{ placedAt: "desc" }, { id: "asc" }],
      skip: (filter.page - 1) * ADMIN_ORDERS_PAGE_SIZE,
      take: ADMIN_ORDERS_PAGE_SIZE,
      select: {
        id: true,
        number: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        totalCents: true,
        placedAt: true,
        shipName: true,
        user: { select: { email: true } },
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.count({ where: condition }),
  ])

  return {
    orders,
    total,
    page: filter.page,
    pageCount: Math.max(
      1,
      Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE)
    ),
  }
}

/** An order with everything an admin needs, and the history of changes to it. */
export async function getAdminOrder(number: string) {
  const order = await prisma.order.findUnique({
    where: { number },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      items: { orderBy: { id: "asc" } },
    },
  })
  if (!order) return null

  const history = await prisma.auditLog.findMany({
    where: { targetType: "order", targetId: order.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  return { ...order, history }
}
