import type { Prisma } from "@/generated/prisma/client"
import {
  deleteObjects,
  inspectUpload,
} from "@/lib/storage/uploads"

type Tx = Prisma.TransactionClient

/** Whether every just-uploaded photo exists, is small enough and is really an image. */
export async function allArrived(keys: string[]) {
  const checks = await Promise.all(keys.map(inspectUpload))
  return checks.every((check) => check.ok)
}

/**
 * The files among `photos` that can go. A placed order keeps its own copy of
 * the picture's address, so a file an order still shows stays; the sample
 * catalog's pictures (no key) are files of the app and are never touched.
 */
export async function removableKeys(
  tx: Tx,
  photos: { key: string | null; url: string }[]
) {
  const stored = photos.filter(
    (photo) => photo.key !== null
  )
  if (stored.length === 0) return []
  const shown = await tx.orderItem.findMany({
    where: { imageUrl: { in: stored.map((p) => p.url) } },
    select: { imageUrl: true },
  })
  const kept = new Set(shown.map((item) => item.imageUrl))
  return stored
    .filter((photo) => !kept.has(photo.url))
    .map((photo) => photo.key!)
}

/**
 * Deletes files after the change that dropped them has been saved. A failure
 * is logged, not raised: the product is already changed, and a file nothing
 * refers to is picked up by the sweep of unused files.
 */
export async function deleteFiles(keys: string[]) {
  try {
    await deleteObjects(keys)
  } catch (error) {
    console.error("photo files could not be deleted", error)
  }
}
