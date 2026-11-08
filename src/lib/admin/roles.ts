import { prisma } from "@/lib/db/client"

import { recordAudit } from "./audit"

export type GrantResult =
  "granted" | "already-admin" | "not-found" | "not-verified"
export type RevokeResult =
  "revoked" | "not-admin" | "not-found" | "last-admin"

// One lock for every role change, so two commands cannot together leave the
// shop without an admin or grant the same account twice.
const LOCK = "admin-roles"

/**
 * Makes an existing account an admin. Only an operator can: nothing in the web
 * app calls this, and a role cannot be set from a request. The address must be
 * verified, so a role is never handed to someone who has not proven the address
 * is theirs.
 */
export function grantAdmin(
  email: string
): Promise<GrantResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCK}))`
    const user = await tx.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })
    if (!user) return "not-found"
    if (user.role === "ADMIN") return "already-admin"
    if (!user.emailVerified) return "not-verified"

    await tx.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    })
    await recordAudit(tx, {
      actor: null,
      action: "admin.grant",
      targetType: "user",
      targetId: user.id,
      summary: `${user.email} was made an admin`,
    })
    return "granted"
  })
}

/**
 * Takes the admin role away. Refuses to remove the last admin unless forced,
 * because nobody could then make another one from the app's side.
 */
export function revokeAdmin(
  email: string,
  options: { force?: boolean } = {}
): Promise<RevokeResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCK}))`
    const user = await tx.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })
    if (!user) return "not-found"
    if (user.role !== "ADMIN") return "not-admin"

    if (!options.force) {
      const admins = await tx.user.count({
        where: { role: "ADMIN" },
      })
      if (admins <= 1) return "last-admin"
    }

    await tx.user.update({
      where: { id: user.id },
      data: { role: "USER" },
    })
    await recordAudit(tx, {
      actor: null,
      action: "admin.revoke",
      targetType: "user",
      targetId: user.id,
      summary: `${user.email} is no longer an admin`,
    })
    return "revoked"
  })
}
