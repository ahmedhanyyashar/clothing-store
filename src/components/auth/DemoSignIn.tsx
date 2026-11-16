"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"

// The accounts `pnpm db:seed` creates (prisma/seed.ts has the same values). The
// password is public on purpose: the buttons give everyone this access anyway.
const DEMO_PASSWORD = "demo-password"
const DEMO_EMAIL = {
  customer: "demo@clothing-store.example",
  admin: "demo-admin@clothing-store.example",
}
type DemoKind = keyof typeof DEMO_EMAIL

/**
 * Two buttons for visitors who only want to look around. They sign in with the
 * seeded demo accounts, which are ordinary users, so the admin can do
 * everything an admin can.
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
    const { error: failed } = await authClient.signIn.email(
      {
        email: DEMO_EMAIL[kind],
        password: DEMO_PASSWORD,
      }
    )
    if (failed) {
      setBusy(undefined)
      setError(
        "The demo account could not be opened. Try again, or sign in with your own account."
      )
      return
    }
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
        Use a demo account with sample orders. The demo
        admin is a real admin, so changes made there are
        real.
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
