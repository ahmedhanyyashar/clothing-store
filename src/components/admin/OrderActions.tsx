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
import { orderAction } from "@/lib/admin/actions"
import {
  ACTION_LABEL,
  type AdminAction,
} from "@/lib/admin/order-rules"

/**
 * The buttons for what can be done to an order now. `actions` comes from the
 * server (`availableActions`); the server checks again when one is pressed.
 */
export function OrderActions({
  number,
  actions,
  refundNote,
}: {
  number: string
  actions: AdminAction[]
  /** Set for a paid card order, to say what cancelling will do to the payment. */
  refundNote?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function run(action: AdminAction) {
    setBusy(true)
    const result = await orderAction(number, action)
    if (result.ok) toast.success(result.message)
    else toast.error(result.message, { duration: 10_000 })
    setBusy(false)
    // either way the page should show the order as it is now
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {actions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing more can be done to this order.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) =>
          action === "cancel" ? (
            <AlertDialog key={action}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={busy}
                >
                  {ACTION_LABEL.cancel}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Cancel order {number}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Its items go back on sale and the
                    customer is emailed. {refundNote}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    Keep order
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void run("cancel")}
                  >
                    Cancel order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              key={action}
              disabled={busy}
              variant={
                action === "refund" ? "outline" : "default"
              }
              onClick={() => void run(action)}
            >
              {ACTION_LABEL[action]}
            </Button>
          )
        )}
      </div>
    </div>
  )
}
