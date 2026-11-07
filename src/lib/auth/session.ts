import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { cache } from "react"

import type { Role } from "@/generated/prisma/enums"
import { auth } from "@/lib/auth/auth"

/**
 * The current session, or null when signed out. Cached per request, so any
 * number of server components can ask without repeating the lookup.
 */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)

/**
 * The signed-in user. Signed-out visitors are sent to sign in and brought back
 * to `returnTo` afterwards. This is the real access check: the proxy only saves
 * a round trip, so every protected page and action calls this itself.
 */
export async function requireUser(returnTo: string) {
  const session = await getSession()
  if (!session) {
    redirect(
      `/sign-in?redirect=${encodeURIComponent(returnTo)}`
    )
  }
  return session.user
}

/**
 * The signed-in user, who must also hold `role`. Anyone else gets a 404, so
 * the existence of role-only areas is not revealed.
 */
export async function requireRole(
  role: Role,
  returnTo: string
) {
  const user = await requireUser(returnTo)
  if (user.role !== role) notFound()
  return user
}
