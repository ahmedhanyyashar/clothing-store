import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"

type Tx = Prisma.TransactionClient

/** What an operator's command is recorded as: it has no account. */
export const OPERATOR = "operator"

export type AuditEntry = {
  /** Who did it. Null for an operator's command. */
  actor: { id: string; label: string } | null
  /** A dotted name such as `order.ship` or `admin.grant`. */
  action: string
  targetType: "order" | "product" | "user"
  targetId: string
  /** A sentence a person can read without looking anything up. */
  summary: string
}

/**
 * Writes an audit entry. Call it with the transaction that makes the change,
 * so the change and its record are saved together or not at all.
 */
export function recordAudit(tx: Tx, entry: AuditEntry) {
  return tx.auditLog.create({
    data: {
      actorId: entry.actor?.id ?? null,
      actorLabel: entry.actor?.label ?? OPERATOR,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary,
    },
  })
}

/** How an admin is named in the log: the name and address they had at the time. */
export function actorOf(user: {
  id: string
  name: string
  email: string
}) {
  return {
    id: user.id,
    label: `${user.name} <${user.email}>`,
  }
}

export const AUDIT_PAGE_SIZE = 25

/** The newest entries first; the id breaks ties so no entry moves between pages. */
export async function listAudit(page: number) {
  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count(),
  ])
  return {
    entries,
    total,
    page,
    pageCount: Math.max(
      1,
      Math.ceil(total / AUDIT_PAGE_SIZE)
    ),
  }
}
