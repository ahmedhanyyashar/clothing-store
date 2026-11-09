import type { MetadataRoute } from "next"

import { env } from "@/env"

// Pages with no value in a search result: private, per-person or transient.
// Each also carries its own noindex, which is what keeps a linked URL out.
const PRIVATE_PATHS = [
  "/admin",
  "/account",
  "/cart",
  "/checkout",
  "/api/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    sitemap: new URL(
      "/sitemap.xml",
      env.NEXT_PUBLIC_APP_URL
    ).href,
  }
}
