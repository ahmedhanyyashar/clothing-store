"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"
import type { DemoKind } from "@/lib/demo/accounts"
import { signInAsDemoAction } from "@/lib/demo/actions"

/**
 * Two buttons for visitors who only want to look around. They are shown only
 * where the demo accounts exist (the page decides), and the accounts are
 * limited on the server: the admin can see everything and change nothing.
 */
export function DemoSignIn({
  redirectTo,
}: {
  redirectTo: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<DemoKind>()
  const [error, setError] = useState<string>()

  async function enter(kind: DemoKind) {
    setBusy(kind)
    setError(undefined)
    const result = await signInAsDemoAction(kind)
    if (!result.ok) {
      setBusy(undefined)
      setError(result.message)
      return
    }
    // the sign-in happened on the server, so tell the header
    authClient.$store.notify("$sessionSignal")
    router.push(
      (kind === "admin" ? "/admin" : redirectTo) as Route
    )
    router.refresh()
  }

  return (
    <section
      aria-labelledby="demo-heading"
      className="mt-6 space-y-3 rounded-lg border border-border p-4"
    >
      <h2
        id="demo-heading"
        className="text-sm font-semibold"
      >
        Just looking?
      </h2>
      <p className="text-sm text-muted-foreground">
        Use a demo account with sample orders. Demo accounts
        cannot be changed, and the demo admin can see
        everything but change nothing.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy !== undefined}
          onClick={() => void enter("customer")}
        >
          {busy === "customer"
            ? "Opening…"
            : "Use the demo shopper"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy !== undefined}
          onClick={() => void enter("admin")}
        >
          {busy === "admin"
            ? "Opening…"
            : "Use the demo admin"}
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </section>
  )
}
