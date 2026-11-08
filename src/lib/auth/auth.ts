import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import {
  APIError,
  createAuthMiddleware,
} from "better-auth/api"

import { env } from "@/env"
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/validations"
import { prisma } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/mailer"
import {
  passwordChangedEmail,
  passwordResetEmail,
  verificationEmail,
} from "@/lib/email/templates"
import {
  anonymiseOrders,
  hasActiveOrders,
} from "@/lib/orders/account"

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
    // a reset ends every session, so whoever held the old password is signed out
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        ...passwordResetEmail({ name: user.name, url }),
      }).catch((error) =>
        console.error("password reset email failed", error)
      )
    },
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
    // Deleting needs the password, or a session created recently for people
    // who sign in with Google and have no password.
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        // An order that is still on its way needs its address and a person
        // to receive it, so the account stays until the order is done.
        if (await hasActiveOrders(user.id)) {
          throw new APIError("BAD_REQUEST", {
            message:
              "You have an order that is not delivered or cancelled yet. Cancel it or wait for it to arrive, then delete your account.",
          })
        }
        // Finished orders are kept for the shop's records, without the
        // customer's personal details.
        await anonymiseOrders(user.id)
      },
    },
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
  hooks: {
    // The owner is told whenever the password changes, so a change they did
    // not make is noticed. Not awaited, like the other emails here.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/change-password") return
      // a refused change (wrong current password) comes back as an error
      const returned = ctx.context.returned
      if (returned instanceof Error) return
      const user = (
        returned as
          | { user?: { email: string; name: string } }
          | undefined
      )?.user
      if (!user) return
      void sendEmail({
        to: user.email,
        ...passwordChangedEmail({
          name: user.name,
          resetUrl: `${env.NEXT_PUBLIC_APP_URL}/forgot-password`,
        }),
      }).catch((error) =>
        console.error(
          "password changed email failed",
          error
        )
      )
    }),
  },
  // Stored in the database so limits hold across server instances.
  rateLimit: {
    enabled: true,
    storage: "database",
    // Both check a password, so they get a guessing limit of their own.
    customRules: {
      "/change-password": { window: 60, max: 5 },
      "/delete-user": { window: 60, max: 5 },
    },
  },
})
