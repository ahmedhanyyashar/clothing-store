import type { NextConfig } from "next"

import { publicBase } from "./src/lib/storage/public-base"

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

// Photos come from the bucket, so next/image may load from there. A stand-in
// server runs on this machine, which next/image refuses unless told otherwise.
const photoHost = process.env.S3_BUCKET
  ? new URL(
      publicBase({
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION ?? "us-east-1",
        endpoint: process.env.S3_ENDPOINT_URL,
        publicUrl: process.env.S3_PUBLIC_URL,
      })
    )
  : null

const nextConfig: NextConfig = {
  // a self-contained server for the container image
  output: "standalone",
  images: {
    remotePatterns: photoHost
      ? [
          {
            protocol: photoHost.protocol.slice(0, -1) as
              "http" | "https",
            hostname: photoHost.hostname,
            port: photoHost.port,
            pathname: `${photoHost.pathname.replace(/\/$/, "")}/**`,
          },
        ]
      : [],
    dangerouslyAllowLocalIP: Boolean(
      process.env.S3_ENDPOINT_URL
    ),
  },
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
