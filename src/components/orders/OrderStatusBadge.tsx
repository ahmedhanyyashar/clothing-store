import type { OrderStatus } from "@/generated/prisma/enums"
import { ORDER_STATUS_INFO } from "@/lib/orders/status"
import { cn } from "@/lib/utils"

export function OrderStatusBadge({
  status,
}: {
  status: OrderStatus
}) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-medium",
        status === "CANCELLED"
          ? "border border-destructive text-destructive"
          : "bg-accent"
      )}
    >
      {ORDER_STATUS_INFO[status].label}
    </span>
  )
}
