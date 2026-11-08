import { ListObjectsV2Command } from "@aws-sdk/client-s3"

import { prisma } from "@/lib/db/client"

import { BUCKET, publicUrl, s3 } from "./client"
import { isPhotoKey } from "./rules"
import { deleteObjects } from "./uploads"

/**
 * Deletes the photo files nothing needs: uploaded long enough ago (before
 * `before`), and neither on a product nor shown by a placed order. These are
 * left by uploads that were never saved, and by files whose deletion failed.
 * With `dryRun` it only reports.
 *
 * It cannot take a file that is about to be attached: `inspectUpload` refuses
 * a file older than the time the sweep waits, so by the time a file can be
 * swept it can no longer be saved onto a product.
 */
export async function sweepUnusedPhotos({
  before,
  dryRun = false,
  pageSize = 1000,
}: {
  before: Date
  dryRun?: boolean
  pageSize?: number
}) {
  let checked = 0
  const removed: string[] = []
  let token: string | undefined

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: "products/",
        MaxKeys: pageSize,
        ContinuationToken: token,
      })
    )
    token = page.NextContinuationToken

    const old = (page.Contents ?? [])
      .filter(
        (object) =>
          object.Key &&
          isPhotoKey(object.Key) &&
          object.LastModified &&
          object.LastModified < before
      )
      .map((object) => object.Key!)
    checked += page.Contents?.length ?? 0
    if (old.length === 0) continue

    const [onProducts, onOrders] = await Promise.all([
      prisma.productImage.findMany({
        where: { key: { in: old } },
        select: { key: true },
      }),
      prisma.orderItem.findMany({
        where: { imageUrl: { in: old.map(publicUrl) } },
        select: { imageUrl: true },
      }),
    ])
    const inUse = new Set<string | null>([
      ...onProducts.map((row) => row.key),
      ...onOrders.map((row) => row.imageUrl),
    ])
    const unused = old.filter(
      (key) => !inUse.has(key) && !inUse.has(publicUrl(key))
    )

    if (!dryRun) await deleteObjects(unused)
    removed.push(...unused)
  } while (token)

  return { checked, removed }
}
