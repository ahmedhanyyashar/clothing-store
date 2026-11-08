import type { Prisma } from "@/generated/prisma/client"
import type { OrderStatus } from "@/generated/prisma/enums"
import { prisma } from "@/lib/db/client"
import { escapeLike } from "@/lib/db/like"

import type { Sort } from "./sorting"

export const ADMIN_ORDERS_PAGE_SIZE = 20

/** The columns the order list can be sorted by, and the order it starts in. */
export const ORDER_SORTS = [
  "number",
  "customer",
  "total",
  "status",
  "placed",
] as const
export type OrderSort = Sort<(typeof ORDER_SORTS)[number]>
export const DEFAULT_ORDER_SORT: OrderSort = {
  key: "placed",
  dir: "desc",
}

const ORDER_COLUMN = {
  number: "number",
  customer: "shipName",
  total: "totalCents",
  status: "status",
  placed: "placedAt",
} as const

export type AdminOrderFilter = {
  status?: OrderStatus
  /** Matches the order number, the recipient's name or the customer's email. */
  q?: string
  page: number
  sort?: OrderSort
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
      orderBy: [
        {
          [ORDER_COLUMN[
            (filter.sort ?? DEFAULT_ORDER_SORT).key
          ]]: (filter.sort ?? DEFAULT_ORDER_SORT).dir,
        } as Prisma.OrderOrderByWithRelationInput,
        { id: "asc" },
      ],
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
