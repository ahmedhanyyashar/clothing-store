import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

import { env } from "@/env"
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/validations"
import { prisma } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/mailer"
import { verificationEmail } from "@/lib/email/templates"

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    // an account that cannot prove its address cannot sign in
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // Not awaited: a slow mail server must not change the response time, or
    // the endpoint would reveal whether an address is registered.
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        ...verificationEmail({ name: user.name, url }),
      }).catch((error) =>
        console.error("verification email failed", error)
      )
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  user: {
    additionalFields: {
      // Exposed on the session so the UI can show role-specific links. It is
      // display only: pages and actions check the role on the server.
      // `input: false` means a sign-up request cannot set it.
      role: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  // Stored in the database so limits hold across server instances.
  rateLimit: { enabled: true, storage: "database" },
})
