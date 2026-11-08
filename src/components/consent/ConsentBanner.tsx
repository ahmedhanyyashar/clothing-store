"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { setConsent, useConsent } from "@/lib/consent"

/** Asks once, with two equal choices, and stays out of the way afterwards. */
export function ConsentBanner() {
  const consent = useConsent()
  if (consent !== null) return null

  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm">
          We use essential cookies to keep you signed in and
          to remember your cart. With your permission we
          also use Google Analytics to count visits.{" "}
          <Link href="/cookies" className="underline">
            Cookie policy
          </Link>
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setConsent("denied")}
          >
            Essential only
          </Button>
          <Button
            variant="outline"
            onClick={() => setConsent("granted")}
          >
            Allow analytics
          </Button>
        </div>
      </div>
    </section>
  )
}
