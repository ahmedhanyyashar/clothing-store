"use client"

import { resetConsent } from "@/lib/consent"

/** Lets a visitor change their mind: the banner asks again. */
export function CookieSettings() {
  return (
    <button
      type="button"
      onClick={resetConsent}
      className="underline underline-offset-4"
    >
      Cookie settings
    </button>
  )
}
