import type { Prisma } from "@/generated/prisma/client"

/**
 * Puts the stock of a cancelled order back. Callers cancel the order with a
 * guarded status change first and call this only when that change happened, so
 * the stock is returned once however often a cancel is asked for.
 */
export async function restoreStock(
  tx: Prisma.TransactionClient,
  items: {
    productId: string | null
    size: string
    quantity: number
  }[]
) {
  for (const item of items) {
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
}
