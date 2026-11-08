import { prisma } from "@/lib/db/client"

import { CUSTOMER_CANCELLABLE } from "./status"

export type CancelResult =
  "cancelled" | "not-cancellable" | "not-found"

/**
 * Cancels the user's own order while it is still pending, and puts its stock
 * back. The status change is the guard: it only matches a pending order, so
 * cancelling twice, or racing with confirmation, restores the stock once or
 * not at all.
 */
export function cancelOrder(
  userId: string,
  number: string
): Promise<CancelResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { userId, number },
      select: {
        id: true,
        items: {
          select: {
            productId: true,
            size: true,
            quantity: true,
          },
        },
      },
    })
    if (!order) return "not-found"

    const { count } = await tx.order.updateMany({
      where: {
        id: order.id,
        status: { in: [...CUSTOMER_CANCELLABLE] },
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    })
    if (count === 0) return "not-cancellable"

    for (const item of order.items) {
      // a product deleted since the order has no stock to give back
      if (!item.productId) continue
      await tx.productSize.updateMany({
        where: {
          productId: item.productId,
          label: item.size,
        },
        data: { stock: { increment: item.quantity } },
      })
    }
    return "cancelled"
  })
}
