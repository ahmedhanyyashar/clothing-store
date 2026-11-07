"use client"

import { useEffect } from "react"

// Replaces the root layout when it fails, so it renders its own <html>.
export default function GlobalError({
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
    <html lang="en">
      <body>
        <main>
          <h1>Something went wrong</h1>
          <p>
            An unexpected error occurred. Please try again.
          </p>
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
          {error.digest && <p>Error ID: {error.digest}</p>}
        </main>
      </body>
    </html>
  )
}
