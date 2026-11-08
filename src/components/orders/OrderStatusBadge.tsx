import { Badge } from "@/components/ui/badge"
import type { OrderStatus } from "@/generated/prisma/enums"
import { ORDER_STATUS_INFO } from "@/lib/orders/status"

// The compiler rejects a status without a look.
const VARIANT = {
  PENDING: "outline",
  CONFIRMED: "secondary",
  SHIPPED: "secondary",
  DELIVERED: "default",
  CANCELLED: "destructive",
} as const satisfies Record<OrderStatus, string>

export function OrderStatusBadge({
  status,
}: {
  status: OrderStatus
}) {
  return (
    <Badge variant={VARIANT[status]}>
      {ORDER_STATUS_INFO[status].label}
    </Badge>
  )
}
