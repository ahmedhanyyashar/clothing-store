"use server"

import { z } from "zod"

import { requireUser } from "@/lib/auth/session"

import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from "./queries"
import {
  addressSchema,
  MAX_ADDRESSES,
  normalizeAddress,
  type AddressInput,
} from "./validations"

export type SaveResult =
  | { ok: true }
  | {
      ok: false
      /** A problem with the request as a whole */
      message?: string
      /** A problem with single fields, which the form shows beside them */
      fieldErrors?: Partial<
        Record<keyof AddressInput, string>
      >
    }

// Every action checks the user itself: calling one is a plain POST that
// anyone can send, whatever page it was meant for.

/** Creates an address (`id` null) or updates one of the user's own. */
export async function saveAddress(
  id: string | null,
  input: unknown
): Promise<SaveResult> {
  const user = await requireUser(
    id
      ? `/account/addresses/${id}`
      : "/account/addresses/new"
  )

  // the browser validated already; this is the check that counts
  const parsed = addressSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(
        z.flattenError(parsed.error).fieldErrors
      ).map(([field, messages]) => [field, messages?.[0]])
    )
    return { ok: false, fieldErrors }
  }
  const data = normalizeAddress(parsed.data)

  if (id === null) {
    const created = await createAddress(user.id, data)
    return created.ok
      ? { ok: true }
      : {
          ok: false,
          message: `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`,
        }
  }

  const updated = await updateAddress(user.id, id, data)
  return updated
    ? { ok: true }
    : {
        ok: false,
        message: "That address no longer exists.",
      }
}

export async function removeAddress(id: string) {
  const user = await requireUser("/account/addresses")
  return { ok: await deleteAddress(user.id, id) }
}

export async function makeDefaultAddress(id: string) {
  const user = await requireUser("/account/addresses")
  return { ok: await setDefaultAddress(user.id, id) }
}
