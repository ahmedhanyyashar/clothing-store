"use client"

import { useEffect } from "react"

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main>
      <h1>Something went wrong</h1>
      <p>An unexpected error occurred. Please try again.</p>
      <button type="button" onClick={() => retry()}>
        Try again
      </button>
      {error.digest && <p>Error ID: {error.digest}</p>}
    </main>
  )
}
