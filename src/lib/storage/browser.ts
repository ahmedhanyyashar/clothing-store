import {
  isPhotoType,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
} from "./rules"

export type UploadedPhoto = {
  key: string
  url: string
  name: string
}

/** Why a file cannot be a photo, or null if it can. Checked before anything is sent. */
export function photoProblem(file: {
  name: string
  type: string
  size: number
}) {
  if (!isPhotoType(file.type))
    return `${file.name} is not a JPEG, PNG or WebP image.`
  if (file.size === 0) return `${file.name} is empty.`
  if (file.size > MAX_PHOTO_BYTES)
    return `${file.name} is over ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`
  return null
}

/**
 * Sends photos straight to the bucket, each with its own one-time form from
 * the app. Throws a sentence for the admin if any file is refused; photos
 * that did arrive before the failure are left for the sweep of unused files.
 */
export async function uploadPhotos(
  files: File[]
): Promise<UploadedPhoto[]> {
  if (files.length === 0) return []
  if (files.length > MAX_PHOTOS)
    throw new Error(
      `Add up to ${MAX_PHOTOS} photos at a time.`
    )
  for (const file of files) {
    const problem = photoProblem(file)
    if (problem) throw new Error(problem)
  }

  const response = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: files.map(({ type, size }) => ({
        type,
        size,
      })),
    }),
  })
  if (!response.ok) {
    const { error } = (await response
      .json()
      .catch(() => ({}))) as {
      error?: string
    }
    throw new Error(
      error ?? "Could not prepare the upload."
    )
  }
  const { uploads } = (await response.json()) as {
    uploads: {
      key: string
      url: string
      fields: Record<string, string>
      publicUrl: string
    }[]
  }

  return Promise.all(
    files.map(async (file, index) => {
      const upload = uploads[index]
      const form = new FormData()
      for (const [name, value] of Object.entries(
        upload.fields
      ))
        form.append(name, value)
      // the file goes last: S3 ignores any field after it
      form.append("file", file)
      const sent = await fetch(upload.url, {
        method: "POST",
        body: form,
      })
      if (!sent.ok)
        throw new Error(
          `${file.name} could not be uploaded.`
        )
      return {
        key: upload.key,
        url: upload.publicUrl,
        name: file.name,
      }
    })
  )
}
