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
    // Product photos live in an S3 bucket. Leave the endpoint unset to use AWS;
    // set it to talk to an S3-compatible stand-in (the `storage` service in
    // docker/compose.yaml, used by the tests). Without keys, the SDK looks for
    // credentials the usual AWS way (an instance or task role).
    S3_BUCKET: z.string().min(3),
    S3_REGION: z.string().min(1),
    S3_ENDPOINT_URL: z.url().optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    // The password of the demo accounts made by `pnpm db:seed:demo`. Only that
    // command reads it; leave it unset anywhere the demo data is not wanted.
    DEMO_PASSWORD: z.string().min(8).optional(),
    // Shows "use a demo account" on the sign-in page. Needs DEMO_PASSWORD, and the
    // demo accounts made by the demo seed. Leave it off anywhere else.
    DEMO_MODE: z.stringbool().optional(),
    // Where browsers fetch the photos from. Defaults to the bucket's own address.
    S3_PUBLIC_URL: z.url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    // Google Analytics measurement ID. Without it, no analytics code exists.
    NEXT_PUBLIC_GA_ID: z
      .string()
      .regex(/^G-[A-Z0-9]+$/)
      .optional(),
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
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ENDPOINT_URL: process.env.S3_ENDPOINT_URL,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
    DEMO_PASSWORD: process.env.DEMO_PASSWORD,
    DEMO_MODE: process.env.DEMO_MODE,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  },
  emptyStringAsUndefined: true,
})
