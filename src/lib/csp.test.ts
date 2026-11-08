import { describe, expect, it } from "vitest"

import { buildCsp } from "./csp"

describe("buildCsp", () => {
  it("lets only scripts with this response's nonce run, and forbids framing", () => {
    const csp = buildCsp({ nonce: "abc123" })

    expect(csp).toContain(
      "script-src 'self' 'nonce-abc123' 'strict-dynamic'"
    )
    expect(csp).not.toMatch(
      /script-src[^;]*'unsafe-(inline|eval)'/
    )
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
  })

  it("allows the photo bucket and Google Analytics only when asked", () => {
    const off = buildCsp({ nonce: "n" })
    const on = buildCsp({
      nonce: "n",
      photoOrigin: "https://photos.example.com",
      uploadOrigin:
        "https://bucket.s3.us-east-1.amazonaws.com",
      analytics: true,
    })

    expect(off).not.toContain("google-analytics")
    expect(off).not.toContain("photos.example.com")
    expect(on).toContain(
      "img-src 'self' data: blob: https://photos.example.com"
    )
    // photos are shown from one place and uploaded to another
    expect(on).toContain(
      "connect-src 'self' https://bucket.s3.us-east-1.amazonaws.com"
    )
    expect(on).toContain("https://*.google-analytics.com")
  })

  it("allows eval only in development", () => {
    expect(buildCsp({ nonce: "n", dev: true })).toContain(
      "'unsafe-eval'"
    )
    expect(buildCsp({ nonce: "n" })).not.toContain(
      "'unsafe-eval'"
    )
  })
})
