"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cancelOrderAction } from "@/lib/orders/actions"

/** Cancels a pending order after confirmation. The server decides if it still can. */
export function CancelOrder({
  number,
}: {
  number: string
}) {
  const router = useRouter()
  const [message, setMessage] = useState<string>()

  async function cancel() {
    const result = await cancelOrderAction(number)
    if (result === "cancelled") {
      setMessage(undefined)
      toast.success("Order cancelled.")
    } else {
      setMessage("This order can no longer be cancelled.")
    }
    // either way the page should show the order as it is now
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">Cancel order</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel this order?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Order {number} is cancelled and its items go
              back on sale. You can place a new order at any
              time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Keep order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void cancel()}
            >
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {message && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {message}
        </p>
      )}
    </div>
  )
}
