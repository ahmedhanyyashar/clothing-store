import { describe, expect, it } from "vitest"

import nextConfig from "./next.config"

describe("next.config headers", () => {
  it("applies the security headers to every route", async () => {
    const rules = await nextConfig.headers?.()
    const keys = rules?.[0]?.headers.map(
      (header) => header.key
    )

    expect(rules?.[0]?.source).toBe("/:path*")
    expect(keys).toEqual(
      expect.arrayContaining([
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Strict-Transport-Security",
      ])
    )
  })
})
