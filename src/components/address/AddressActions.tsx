"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

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
import {
  makeDefaultAddress,
  removeAddress,
} from "@/lib/address/actions"

/** Edit, make default and delete for one saved address. `name` is how the buttons are announced. */
export function AddressActions({
  id,
  name,
  isDefault,
}: {
  id: string
  name: string
  isDefault: boolean
}) {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  async function run(
    action: (id: string) => Promise<{ ok: boolean }>
  ) {
    const { ok } = await action(id)
    setFailed(!ok)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link
          href={`/account/addresses/${id}`}
          aria-label={`Edit ${name}`}
        >
          Edit
        </Link>
      </Button>
      {!isDefault && (
        <Button
          variant="outline"
          size="sm"
          aria-label={`Make ${name} the default`}
          onClick={() => void run(makeDefaultAddress)}
        >
          Make default
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${name}`}
          >
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this address?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {name} is removed from your account. Orders
              you already placed keep the address they were
              sent to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void run(removeAddress)}
            >
              Delete address
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {failed && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          That address no longer exists.
        </p>
      )}
    </div>
  )
}
