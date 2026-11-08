import { Badge } from "@/components/ui/badge"
import type {
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/enums"
import { paymentStatusLabel } from "@/lib/payments/status"

const VARIANT = {
  PENDING: "outline",
  PAID: "default",
  FAILED: "destructive",
  REFUNDED: "secondary",
} as const satisfies Record<PaymentStatus, string>

export function PaymentStatusBadge({
  method,
  status,
}: {
  method: PaymentMethod
  status: PaymentStatus
}) {
  return (
    <Badge variant={VARIANT[status]}>
      {paymentStatusLabel(method, status)}
    </Badge>
  )
}
