import { formatPrice } from "@/lib/catalog/format"
import {
  CATEGORY_INFO,
  TYPE_INFO,
} from "@/lib/catalog/taxonomy"
import { prisma } from "@/lib/db/client"
import { publicUrl } from "@/lib/storage/client"

import { actorOf, recordAudit } from "./audit"
import type { Admin } from "./order-actions"
import {
  allArrived,
  deleteFiles,
  removableKeys,
} from "./photo-files"
import {
  parsePrice,
  type ProductInput,
} from "./product-validations"

/** Why a photo list was refused. */
export type PhotoProblem =
  /** A photo that was just uploaded is not in the bucket, or is not an image. */
  | { ok: false; reason: "photos-missing" }
  /** The list names a photo this product does not have: someone else changed them. */
  | { ok: false; reason: "photos-changed" }

export type ProductChange =
  | { ok: true; id: string; changed: boolean }
  | { ok: false; reason: "not-found" }
  | PhotoProblem
  /** Stock was changed by someone else (a sale, another admin) since the form loaded. */
  | { ok: false; reason: "stock-changed"; sizes: string[] }

/** Thrown inside the transaction to roll the whole save back. */
class PhotosChanged extends Error {}

class StockChanged extends Error {
  constructor(readonly sizes: string[]) {
    super("stock changed")
  }
}

const count = (n: number, noun: string) =>
  `${n} ${noun}${n === 1 ? "" : "s"}`

const newKeys = (input: ProductInput) =>
  input.photos.flatMap((photo) =>
    photo.key ? [photo.key] : []
  )

/** Adds a product. A product without photos shows a placeholder. */
export async function createProduct(
  admin: Admin,
  input: ProductInput
): Promise<{ ok: true; id: string } | PhotoProblem> {
  const priceCents = parsePrice(input.price)!
  // a new product has no photos to keep, only ones just uploaded
  if (input.photos.some((photo) => photo.id !== null))
    return { ok: false, reason: "photos-changed" }
  if (!(await allArrived(newKeys(input))))
    return { ok: false, reason: "photos-missing" }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: input.name,
        description: input.description,
        priceCents,
        category: input.category,
        type: input.type,
        bestSeller: input.bestSeller,
        sizes: {
          create: input.sizes.map((size, position) => ({
            label: size.label,
            stock: size.stock,
            position,
          })),
        },
        colors: { create: input.colors },
        images: {
          create: input.photos.map((photo, position) => ({
            key: photo.key!,
            url: publicUrl(photo.key!),
            position,
          })),
        },
      },
      select: { id: true },
    })
    await recordAudit(tx, {
      actor: actorOf(admin),
      action: "product.create",
      targetType: "product",
      targetId: product.id,
      summary: `"${input.name}" was added at ${formatPrice(priceCents)} with sizes ${input.sizes.map((s) => s.label).join(", ")}${input.photos.length > 0 ? ` and ${count(input.photos.length, "photo")}` : ""}`,
    })
    return { ok: true as const, id: product.id }
  })
}

/**
 * Saves a product. The audit entry says exactly what changed, and a save that
 * changes nothing writes nothing.
 *
 * Stock needs care, because it also changes whenever someone buys. A size's
 * stock is written only if the admin changed that number, and only if it is
 * still what the admin saw: otherwise the save is refused and nothing is saved,
 * so an old form can never overwrite a sale.
 */
export async function updateProduct(
  admin: Admin,
  id: string,
  input: ProductInput
): Promise<ProductChange> {
  const priceCents = parsePrice(input.price)!
  if (!(await allArrived(newKeys(input))))
    return { ok: false, reason: "photos-missing" }

  // files to delete once the save has gone through
  let remove: string[] = []

  try {
    const result = await prisma.$transaction(async (tx) => {
      // admins editing the same product take turns
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "product" WHERE id = ${id} FOR UPDATE
      `
      if (rows.length === 0)
        return {
          ok: false as const,
          reason: "not-found" as const,
        }
      const product = await tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          sizes: { orderBy: { position: "asc" } },
          colors: { orderBy: { id: "asc" } },
          images: { orderBy: { position: "asc" } },
        },
      })

      const changes: string[] = []
      const was = (
        before: string,
        after: string,
        label: string
      ) => {
        if (before !== after)
          changes.push(`${label} ${before} → ${after}`)
      }

      if (product.name !== input.name) {
        changes.push(`renamed from "${product.name}"`)
      }
      was(
        formatPrice(product.priceCents),
        formatPrice(priceCents),
        "price"
      )
      was(
        CATEGORY_INFO[product.category].label,
        CATEGORY_INFO[input.category].label,
        "category"
      )
      was(
        TYPE_INFO[product.type].label,
        TYPE_INFO[input.type].label,
        "type"
      )
      if (product.bestSeller !== input.bestSeller) {
        changes.push(
          input.bestSeller
            ? "made a best seller"
            : "no longer a best seller"
        )
      }
      if (product.description !== input.description)
        changes.push("description changed")

      // sizes are identified by their label, so a label is never edited in place
      const existing = new Map(
        product.sizes.map((size) => [size.label, size])
      )
      const kept = new Set(
        input.sizes.map((size) => size.label)
      )
      const conflicts: string[] = []

      for (const [
        position,
        size,
      ] of input.sizes.entries()) {
        const row = existing.get(size.label)
        if (!row) {
          await tx.productSize.create({
            data: {
              productId: id,
              label: size.label,
              stock: size.stock,
              position,
            },
          })
          changes.push(
            `size ${size.label} added with ${size.stock} in stock`
          )
          continue
        }

        const edited =
          size.expectedStock !== null &&
          size.stock !== size.expectedStock
        if (edited && row.stock !== size.stock) {
          // compare-and-set: only if the stock is still what the admin saw
          const { count } = await tx.productSize.updateMany(
            {
              where: {
                id: row.id,
                stock: size.expectedStock!,
              },
              data: { stock: size.stock },
            }
          )
          if (count === 0) conflicts.push(size.label)
          else
            changes.push(
              `stock of ${size.label} ${row.stock} → ${size.stock}`
            )
        }
        if (row.position !== position) {
          await tx.productSize.update({
            where: { id: row.id },
            data: { position },
          })
        }
      }
      if (conflicts.length > 0)
        throw new StockChanged(conflicts)

      // photos: keep the ones listed, drop the rest, add the new ones
      const owned = new Set(product.images.map((i) => i.id))
      if (
        input.photos.some(
          (photo) =>
            photo.id !== null && !owned.has(photo.id)
        )
      )
        throw new PhotosChanged()
      const keep = new Set(
        input.photos.map((photo) => photo.id)
      )
      const dropped = product.images.filter(
        (image) => !keep.has(image.id)
      )
      if (dropped.length > 0) {
        await tx.productImage.deleteMany({
          where: { id: { in: dropped.map((i) => i.id) } },
        })
        remove = await removableKeys(tx, dropped)
        changes.push(
          `${count(dropped.length, "photo")} removed`
        )
      }
      let added = 0
      let moved = false
      for (const [
        position,
        photo,
      ] of input.photos.entries()) {
        if (photo.id === null) {
          await tx.productImage.create({
            data: {
              productId: id,
              key: photo.key!,
              url: publicUrl(photo.key!),
              position,
            },
          })
          added += 1
          continue
        }
        const row = product.images.find(
          (i) => i.id === photo.id
        )!
        if (row.position !== position) {
          await tx.productImage.update({
            where: { id: row.id },
            data: { position },
          })
          moved = true
        }
      }
      if (added > 0)
        changes.push(`${count(added, "photo")} added`)
      else if (moved && dropped.length === 0)
        changes.push("photos reordered")

      for (const row of product.sizes) {
        if (kept.has(row.label)) continue
        await tx.productSize.delete({
          where: { id: row.id },
        })
        changes.push(`size ${row.label} removed`)
      }

      const colorKey = (c: { name: string; hex: string }) =>
        `${c.name.toLowerCase()}|${c.hex.toLowerCase()}`
      const before = product.colors
        .map(colorKey)
        .sort()
        .join(",")
      const after = input.colors
        .map(colorKey)
        .sort()
        .join(",")
      if (before !== after) {
        await tx.productColor.deleteMany({
          where: { productId: id },
        })
        await tx.productColor.createMany({
          data: input.colors.map((c) => ({
            ...c,
            productId: id,
          })),
        })
        changes.push("colors changed")
      }

      await tx.product.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          priceCents,
          category: input.category,
          type: input.type,
          bestSeller: input.bestSeller,
        },
      })

      if (changes.length === 0) {
        return { ok: true as const, id, changed: false }
      }
      await recordAudit(tx, {
        actor: actorOf(admin),
        action: "product.update",
        targetType: "product",
        targetId: id,
        summary: `"${input.name}": ${changes.join("; ")}`,
      })
      return { ok: true as const, id, changed: true }
    })
    if (result.ok) await deleteFiles(remove)
    return result
  } catch (error) {
    if (error instanceof PhotosChanged)
      return { ok: false, reason: "photos-changed" }
    if (error instanceof StockChanged) {
      return {
        ok: false,
        reason: "stock-changed",
        sizes: error.sizes,
      }
    }
    throw error
  }
}

/**
 * Deletes a product for good, with its sizes, colors and photos, files included.
 * Orders already placed keep their own copy of what was bought, so they are
 * unaffected, and a file an order still shows is kept; the audit entry keeps
 * the name and price.
 */
export async function deleteProduct(
  admin: Admin,
  id: string
): Promise<
  { ok: true } | { ok: false; reason: "not-found" }
> {
  let remove: string[] = []
  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "product" WHERE id = ${id} FOR UPDATE
    `
    if (rows.length === 0)
      return {
        ok: false as const,
        reason: "not-found" as const,
      }
    const product = await tx.product.findUniqueOrThrow({
      where: { id },
      include: { sizes: true, images: true },
    })

    await tx.product.delete({ where: { id } })
    remove = await removableKeys(tx, product.images)
    await recordAudit(tx, {
      actor: actorOf(admin),
      action: "product.delete",
      targetType: "product",
      targetId: id,
      summary: `"${product.name}" (${formatPrice(product.priceCents)}, ${product.sizes.length} ${product.sizes.length === 1 ? "size" : "sizes"}) was deleted`,
    })
    return { ok: true as const }
  })
  if (result.ok) await deleteFiles(remove)
  return result
}
