"use client"

import { useEffect } from "react"

// Replaces the root layout when it fails, so there is no stylesheet, theme
// or font here: inline styles only.
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
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#111",
          background: "#fff",
        }}
      >
        <h1 style={{ fontSize: 28, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          style={{
            maxWidth: 420,
            margin: 0,
            color: "#555",
          }}
        >
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            marginTop: 12,
            padding: "10px 20px",
            border: 0,
            borderRadius: 8,
            background: "#111",
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ fontSize: 12, color: "#555" }}>
            Error ID: {error.digest}
          </p>
        )}
      </body>
    </html>
  )
}
