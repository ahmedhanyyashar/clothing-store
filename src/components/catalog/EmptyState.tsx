import { PackageSearch } from "lucide-react"
import type { ReactNode } from "react"

export function EmptyState({
  message,
  action,
}: {
  message: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
      <PackageSearch
        className="size-8"
        aria-hidden="true"
      />
      <p>{message}</p>
      {action}
    </div>
  )
}
