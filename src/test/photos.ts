import { HeadObjectCommand } from "@aws-sdk/client-s3"

import { BUCKET, s3 } from "@/lib/storage/client"
import { createUpload } from "@/lib/storage/uploads"

/** The first bytes of a real PNG: enough for the file check, not a picture. */
const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0,
  0,
])

/** Puts a photo in the test bucket the way a browser does, and returns its key and address. */
export async function uploadTestPhoto(
  bytes: Uint8Array = PNG
) {
  const upload = await createUpload("image/png")
  const form = new FormData()
  for (const [name, value] of Object.entries(upload.fields))
    form.append(name, value)
  form.append(
    "file",
    new Blob([bytes as BlobPart], { type: "image/png" })
  )
  const response = await fetch(upload.url, {
    method: "POST",
    body: form,
  })
  if (!response.ok) throw new Error("test photo not stored")
  return { key: upload.key, url: upload.publicUrl }
}

export const photoExists = (key: string) =>
  s3
    .send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    )
    .then(
      () => true,
      () => false
    )
