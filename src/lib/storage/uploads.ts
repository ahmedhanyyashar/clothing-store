import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"

import { BUCKET, publicUrl, s3 } from "./client"
import { isPhotoKey, newPhotoKey } from "./keys"
import { MAX_PHOTO_BYTES, type PhotoType } from "./rules"
import { SNIFF_BYTES, sniffPhotoType } from "./sniff"

const FIVE_MINUTES = 5 * 60

/**
 * A one-time form the browser posts a photo with. S3 itself refuses a file that
 * is empty, over the size limit, or of another type than the one asked for, so
 * a bad file is never stored.
 */
export async function createUpload(type: PhotoType) {
  const key = newPhotoKey(type)
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Expires: FIVE_MINUTES,
    Fields: { "Content-Type": type },
    Conditions: [
      ["content-length-range", 1, MAX_PHOTO_BYTES],
      ["eq", "$Content-Type", type],
    ],
  })
  return { key, url, fields, publicUrl: publicUrl(key) }
}

export type Inspection =
  | { ok: true; type: PhotoType; size: number }
  | {
      ok: false
      reason: "missing" | "too-large" | "not-a-photo"
    }

/**
 * Whether `key` holds a real photo: it exists, is within the size limit, and
 * its first bytes are those of a JPEG, PNG or WebP. The upload form already
 * limits what S3 accepts; this does not trust it, because the key comes back
 * from the browser when the product is saved.
 */
export async function inspectUpload(
  key: string
): Promise<Inspection> {
  if (!isPhotoKey(key))
    return { ok: false, reason: "missing" }

  let size: number
  try {
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    )
    size = head.ContentLength ?? 0
  } catch (error) {
    if (isNotFound(error))
      return { ok: false, reason: "missing" }
    throw error
  }
  if (size > MAX_PHOTO_BYTES)
    return { ok: false, reason: "too-large" }

  const object = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Range: `bytes=0-${SNIFF_BYTES - 1}`,
    })
  )
  const bytes = await object.Body?.transformToByteArray()
  const type = bytes && sniffPhotoType(bytes)
  return type
    ? { ok: true, type, size }
    : { ok: false, reason: "not-a-photo" }
}

const isNotFound = (error: unknown) =>
  (error as { name?: string })?.name === "NotFound" ||
  (error as { $metadata?: { httpStatusCode?: number } })
    ?.$metadata?.httpStatusCode === 404

const BATCH = 1000

/** Removes objects. Missing ones are not an error; any other failure throws. */
export async function deleteObjects(keys: string[]) {
  for (let i = 0; i < keys.length; i += BATCH) {
    const result = await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Quiet: true,
          Objects: keys
            .slice(i, i + BATCH)
            .map((Key) => ({ Key })),
        },
      })
    )
    if (result.Errors?.length)
      throw new Error(
        `Could not delete ${result.Errors.length} object(s): ${result.Errors[0].Message}`
      )
  }
}
