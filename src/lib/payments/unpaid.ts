import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"
import { restoreStock } from "@/lib/orders/stock"

type Tx = Prisma.TransactionClient

/**
 * Gives up on an order that is still waiting for its payment: it is cancelled,
 * marked as not paid, and its stock goes back. Anything else (paid, already
 * cancelled, shipped) is left alone. The caller holds the order's row lock, so
 * this cannot interleave with a payment arriving.
 */
export async function cancelUnpaidOrder(
  tx: Tx,
  order: {
    id: string
    status: string
    paymentStatus: string
    items: {
      productId: string | null
      size: string
      quantity: number
    }[]
  }
) {
  if (
    order.status !== "PENDING" ||
    order.paymentStatus !== "PENDING"
  ) {
    return false
  }
  await tx.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      paymentStatus: "FAILED",
    },
  })
  await restoreStock(tx, order.items)
  return true
}

/** Releases a card order whose payment could not be started, so its stock is not held for nothing. */
export function abandonCardOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "order" WHERE id = ${orderId} FOR UPDATE`
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order || order.paymentMethod !== "CARD")
      return false
    return cancelUnpaidOrder(tx, order)
  })
}
