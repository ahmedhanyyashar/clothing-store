"use client"

import { useEffect } from "react"

/**
 * Marks the page once React has taken it over. Until then a form on a
 * server-rendered page ignores what is typed into it, so the end-to-end tests
 * wait for this attribute instead of guessing with the network.
 */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true"
  }, [])
  return null
}
