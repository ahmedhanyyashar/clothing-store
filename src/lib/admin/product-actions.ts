"use server"

import { requireRole } from "@/lib/auth/session"

import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "./product-changes"
import { productSchema } from "./product-validations"

export type SaveProductResult =
  | { ok: true; id: string; changed: boolean }
  | {
      ok: false
      /** A problem with the request as a whole */
      message?: string
      /** Problems with single fields, keyed by their path, for the form to show */
      fieldErrors?: Record<string, string>
    }

// Every action checks the admin itself: calling one is a plain POST that
// anyone can send, whatever page it was meant for.

/** Creates a product (`id` null) or saves changes to one. */
export async function saveProductAction(
  id: string | null,
  input: unknown
): Promise<SaveProductResult> {
  const admin = await requireRole(
    "ADMIN",
    id ? `/admin/products/${id}` : "/admin/products/new"
  )

  // the form's own check is for convenience; this is the one that counts
  const parsed = productSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] ??= issue.message
    }
    return { ok: false, fieldErrors }
  }

  if (id === null) {
    const created = await createProduct(admin, parsed.data)
    return { ok: true, id: created.id, changed: true }
  }

  const result = await updateProduct(admin, id, parsed.data)
  if (result.ok) return result
  return {
    ok: false,
    message:
      result.reason === "not-found"
        ? "That product no longer exists."
        : `The stock of ${result.sizes.join(", ")} changed since you opened this page (a sale, or another admin). Nothing was saved: reload the page and make the change again.`,
  }
}

export async function deleteProductAction(
  id: string
): Promise<{ ok: boolean; message?: string }> {
  const admin = await requireRole(
    "ADMIN",
    `/admin/products/${id}`
  )
  const result = await deleteProduct(admin, id)
  return result.ok
    ? { ok: true }
    : {
        ok: false,
        message: "That product no longer exists.",
      }
}
