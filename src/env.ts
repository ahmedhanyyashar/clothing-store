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
    // signs and encrypts sessions and tokens: generate with `openssl rand -base64 32`
    BETTER_AUTH_SECRET: z.string().min(32),
    // Google sign-in is part of the product, so both values are required
    GOOGLE_CLIENT_ID: z
      .string()
      .endsWith(".apps.googleusercontent.com"),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    // Stripe: a secret API key, and the signing secret of the webhook endpoint
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    // Leave unset to use Stripe. Set it to talk to a stand-in server instead
    // (the `stripe-mock` service in docker/compose.yaml, used by the tests).
    STRIPE_API_URL: z.url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SMTP_URL: process.env.SMTP_URL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET:
      process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_API_URL: process.env.STRIPE_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
})
