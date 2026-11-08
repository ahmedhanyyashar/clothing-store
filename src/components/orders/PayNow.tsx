"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { resumePaymentAction } from "@/lib/payments/actions"

/** Takes the shopper to the Stripe page of a card order that is still waiting for its payment. */
export function PayNow({ number }: { number: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function pay() {
    setBusy(true)
    setError(undefined)
    const result = await resumePaymentAction(number)
    if (result.ok) {
      // leaves the site, so the button stays busy
      window.location.assign(result.url)
      return
    }
    setBusy(false)
    setError(result.message)
  }

  return (
    <div className="space-y-2">
      <Button disabled={busy} onClick={() => void pay()}>
        {busy ? "Opening payment…" : "Pay now"}
      </Button>
      {error && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}
