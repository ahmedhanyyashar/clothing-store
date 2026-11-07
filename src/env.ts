import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

// Validated once at startup: a missing or malformed variable fails the boot
// with a readable error instead of surfacing later as a runtime bug. Every
// variable the app reads is declared here and nowhere else.
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
})
