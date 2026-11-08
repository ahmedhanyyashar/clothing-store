import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"

// Every function takes the user's id and filters by it, like the address
// queries: an order that belongs to someone else is simply not found.

const itemSelect = {
  id: true,
  productId: true,
  name: true,
  size: true,
  imageUrl: true,
  unitPriceCents: true,
  quantity: true,
} satisfies Prisma.OrderItemSelect

const summarySelect = {
  id: true,
  number: true,
  status: true,
  totalCents: true,
  placedAt: true,
  items: {
    select: { name: true, imageUrl: true, quantity: true },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.OrderSelect

const detailSelect = {
  id: true,
  number: true,
  status: true,
  paymentMethod: true,
  subtotalCents: true,
  shippingCents: true,
  totalCents: true,
  shipName: true,
  shipPhone: true,
  shipLine1: true,
  shipLine2: true,
  shipCity: true,
  shipRegion: true,
  shipPostalCode: true,
  shipCountry: true,
  shipNotes: true,
  placedAt: true,
  cancelledAt: true,
  items: { select: itemSelect, orderBy: { id: "asc" } },
} satisfies Prisma.OrderSelect

export type OrderSummary = Prisma.OrderGetPayload<{
  select: typeof summarySelect
}>
export type OrderDetails = Prisma.OrderGetPayload<{
  select: typeof detailSelect
}>

/** The user's orders, newest first. */
export function listOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: [{ placedAt: "desc" }, { id: "asc" }],
    select: summarySelect,
  })
}

export function getOrder(userId: string, number: string) {
  return prisma.order.findFirst({
    where: { userId, number },
    select: detailSelect,
  })
}
