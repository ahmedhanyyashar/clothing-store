import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

// Validated once at startup: a missing or malformed variable fails the boot
// with a readable error instead of surfacing later as a runtime bug. Every
// variable the app reads is declared here and nowhere else.
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    // SMTP connection URL, e.g. smtp://user:pass@host:587
    SMTP_URL: z.url(),
    // sender address for transactional email
    EMAIL_FROM: z.email(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SMTP_URL: process.env.SMTP_URL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
})
