"use client"

import { useSyncExternalStore } from "react"

export type Consent = "granted" | "denied"

const COOKIE = "consent"
const EVENT = "consent-change"

export function readConsent(): Consent | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE}=(granted|denied)`)
  )
  return (match?.[1] as Consent | undefined) ?? null
}

function announce() {
  window.dispatchEvent(new Event(EVENT))
}

/** Remembers the visitor's choice for a year, in a cookie of our own. */
export function setConsent(choice: Consent) {
  document.cookie = `${COOKIE}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax`
  announce()
}

/**
 * Forgets the choice so the banner asks again. Anything analytics left behind
 * is removed, and the page reloads so a running analytics script stops.
 */
export function resetConsent() {
  const was = readConsent()
  document.cookie = `${COOKIE}=; Max-Age=0; Path=/`
  if (was === "granted") {
    for (const part of document.cookie.split("; ")) {
      const name = part.split("=")[0]
      if (name === "_ga" || name.startsWith("_ga_"))
        document.cookie = `${name}=; Max-Age=0; Path=/`
    }
    window.location.reload()
    return
  }
  announce()
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  return () => window.removeEventListener(EVENT, onChange)
}

/** The visitor's choice: undefined until the page has loaded, then granted, denied or null (not asked). */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(
    subscribe,
    readConsent,
    () => undefined
  )
}
