import { prisma } from "@/lib/db/client"

import { ACTIVE_STATUSES } from "./status"

/** Whether the user has an order that still has to be delivered. */
export async function hasActiveOrders(userId: string) {
  const count = await prisma.order.count({
    where: { userId, status: { in: [...ACTIVE_STATUSES] } },
  })
  return count > 0
}

/**
 * Called just before an account is deleted. The order records stay, because
 * tax and accounting rules require them, but the personal details on them
 * are replaced, so nothing identifies the person any more. The country and
 * the items stay: they are not personal.
 */
export async function anonymiseOrders(userId: string) {
  await prisma.order.updateMany({
    where: { userId },
    data: {
      shipName: "Deleted customer",
      shipPhone: "",
      shipLine1: "Deleted",
      shipLine2: null,
      shipCity: "Deleted",
      shipRegion: null,
      shipPostalCode: null,
      shipNotes: null,
    },
  })
}
