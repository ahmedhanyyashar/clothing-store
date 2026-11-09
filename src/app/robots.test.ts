import { describe, expect, it } from "vitest"

import { env } from "@/env"

import robots from "./robots"

describe("robots", () => {
  it("blocks the private areas and points to the sitemap", () => {
    const result = robots()

    expect(result.rules).toMatchObject({
      allow: "/",
      disallow: expect.arrayContaining([
        "/admin",
        "/account",
        "/checkout",
        "/api/",
      ]),
    })
    expect(result.sitemap).toBe(
      new URL("/sitemap.xml", env.NEXT_PUBLIC_APP_URL).href
    )
  })
})
