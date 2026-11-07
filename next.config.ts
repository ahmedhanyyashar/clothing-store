import type { NextConfig } from "next"

export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // lets another build, such as the end-to-end tests, use its own directory
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  typedRoutes: true,
  headers: () =>
    Promise.resolve([
      { source: "/:path*", headers: securityHeaders },
    ]),
}

export default nextConfig
