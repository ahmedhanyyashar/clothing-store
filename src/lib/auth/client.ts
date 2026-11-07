import { inferAdditionalFields } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { env } from "@/env"
import type { auth } from "@/lib/auth/auth"

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  // type-only import: teaches the client about the extra `role` field
  plugins: [inferAdditionalFields<typeof auth>()],
})
