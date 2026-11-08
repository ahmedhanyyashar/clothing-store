"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteProductAction } from "@/lib/admin/product-actions"

/** Deletes a product for good, after a confirmation. */
export function DeleteProduct({
  id,
  name,
}: {
  id: string
  name: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function remove() {
    setBusy(true)
    setError(undefined)
    const result = await deleteProductAction(id)
    if (!result.ok) {
      setBusy(false)
      setError(
        result.message ?? "Something went wrong. Try again."
      )
      return
    }
    router.push("/admin/products" as Route)
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          Delete product
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The product, its sizes and its colors are
            removed for good. Orders already placed keep
            their own copy of what was bought, and carts
            holding it show it as no longer available.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>
            Keep product
          </AlertDialogCancel>
          {/* not AlertDialogAction: it would close the dialog before the result is known */}
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? "Deleting…" : "Delete product"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
