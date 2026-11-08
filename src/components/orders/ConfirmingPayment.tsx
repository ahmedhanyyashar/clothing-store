"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

const EVERY_MS = 2000
const TRIES = 15

/**
 * Shown when the shopper comes back from Stripe before the confirmation has
 * reached us. The page is the database's word, not the address's, so this just
 * asks for it again for a short while.
 */
export function ConfirmingPayment() {
  const router = useRouter()

  useEffect(() => {
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      router.refresh()
      if (tries >= TRIES) clearInterval(timer)
    }, EVERY_MS)
    return () => clearInterval(timer)
  }, [router])

  return (
    <div
      role="status"
      className="rounded-lg border border-border bg-accent p-4"
    >
      <p className="font-semibold">
        Confirming your payment…
      </p>
      <p className="text-sm">
        This usually takes a few seconds. This page updates
        by itself.
      </p>
    </div>
  )
}
