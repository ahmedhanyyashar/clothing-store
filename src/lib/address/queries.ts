import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db/client"

import {
  MAX_ADDRESSES,
  type NormalizedAddress,
} from "./validations"

// Every function takes the user's id and filters by it, so an address that
// belongs to someone else is never read or changed: it simply is not found.

// The country is a plain string here: the database does not know our list, so a
// row is never assumed to hold a country we ship to.
export type SavedAddress = Omit<
  NormalizedAddress,
  "country"
> & {
  id: string
  country: string
  createdAt: Date
}

const select = {
  id: true,
  label: true,
  fullName: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  region: true,
  postalCode: true,
  country: true,
  notes: true,
  isDefault: true,
  createdAt: true,
} satisfies Prisma.AddressSelect

type Tx = Prisma.TransactionClient

/**
 * Runs `work` with this user's addresses locked against other requests, so two
 * of them cannot both pass the "at most 10" check or both set a default. The
 * lock is released when the transaction ends.
 */
function withUserLock<T>(
  userId: string,
  work: (tx: Tx) => Promise<T>
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`
    return work(tx)
  })
}

const clearDefault = (tx: Tx, userId: string) =>
  tx.address.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  })

/** The default first, then the newest. */
export function listAddresses(
  userId: string
): Promise<SavedAddress[]> {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "desc" },
      { id: "asc" },
    ],
    select,
  })
}

export function getAddress(
  userId: string,
  id: string
): Promise<SavedAddress | null> {
  return prisma.address.findFirst({
    where: { id, userId },
    select,
  })
}

/** The first address becomes the default, whatever was asked. */
export function createAddress(
  userId: string,
  data: NormalizedAddress
) {
  return withUserLock(userId, async (tx) => {
    const count = await tx.address.count({
      where: { userId },
    })
    if (count >= MAX_ADDRESSES)
      return {
        ok: false as const,
        reason: "limit" as const,
      }

    const isDefault = data.isDefault || count === 0
    if (isDefault) await clearDefault(tx, userId)
    const address = await tx.address.create({
      data: { ...data, isDefault, userId },
      select,
    })
    return { ok: true as const, address }
  })
}

/** Null when the user has no such address. The current default stays the default until another is chosen. */
export function updateAddress(
  userId: string,
  id: string,
  data: NormalizedAddress
) {
  return withUserLock(userId, async (tx) => {
    const existing = await tx.address.findFirst({
      where: { id, userId },
    })
    if (!existing) return null

    const isDefault = data.isDefault || existing.isDefault
    if (isDefault && !existing.isDefault)
      await clearDefault(tx, userId)
    return tx.address.update({
      where: { id },
      data: { ...data, isDefault },
      select,
    })
  })
}

/** Deleting the default makes the newest remaining address the default. */
export function deleteAddress(userId: string, id: string) {
  return withUserLock(userId, async (tx) => {
    const existing = await tx.address.findFirst({
      where: { id, userId },
    })
    if (!existing) return false

    await tx.address.delete({ where: { id } })
    if (existing.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      })
      if (next) {
        await tx.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        })
      }
    }
    return true
  })
}

export function setDefaultAddress(
  userId: string,
  id: string
) {
  return withUserLock(userId, async (tx) => {
    const existing = await tx.address.findFirst({
      where: { id, userId },
    })
    if (!existing) return false
    if (!existing.isDefault) {
      await clearDefault(tx, userId)
      await tx.address.update({
        where: { id },
        data: { isDefault: true },
      })
    }
    return true
  })
}
