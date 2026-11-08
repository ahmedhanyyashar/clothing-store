import Image from "next/image"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProductInput } from "@/lib/admin/product-validations"
import { uploadPhotos } from "@/lib/storage/browser"
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
} from "@/lib/storage/rules"

type Photos = ProductInput["photos"]

function move(list: Photos, from: number, to: number) {
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

/**
 * The photos of a product: shown in order, the first being the main one. New
 * photos go straight to the bucket when chosen; they belong to the product
 * only once it is saved.
 */
export function PhotoFields({
  photos,
  change,
  error,
}: {
  photos: Photos
  /** Replaces the list with what `update` makes of the list as it is right now. */
  change: (update: (current: Photos) => Photos) => void
  error?: string
}) {
  const inputId = useId()
  const [uploading, setUploading] = useState(false)
  const [problem, setProblem] = useState<string | null>(
    null
  )
  const room = MAX_PHOTOS - photos.length

  async function choose(files: File[]) {
    if (files.length === 0) return
    setProblem(null)
    if (files.length > room) {
      setProblem(
        room === 0
          ? `A product has at most ${MAX_PHOTOS} photos.`
          : `Add up to ${room} more ${room === 1 ? "photo" : "photos"}.`
      )
      return
    }
    setUploading(true)
    try {
      const uploaded = await uploadPhotos(files)
      change((current) => [
        ...current,
        ...uploaded.map(({ key, url }) => ({
          id: null,
          key,
          url,
        })),
      ])
    } catch (caught) {
      setProblem(
        caught instanceof Error
          ? caught.message
          : "The photos could not be uploaded."
      )
    } finally {
      setUploading(false)
    }
  }

  const message = problem ?? error

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">
        Photos (optional)
      </legend>
      <p className="text-sm text-muted-foreground">
        Up to {MAX_PHOTOS} JPEG, PNG or WebP images, each up
        to {MAX_PHOTO_BYTES / 1024 / 1024} MB. The first is
        the main photo.
      </p>

      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-4">
          {photos.map((photo, index) => (
            <li
              key={photo.id ?? photo.key}
              className="space-y-1"
            >
              <div className="relative h-28 w-24 overflow-hidden rounded bg-muted">
                <Image
                  src={photo.url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {index === 0
                  ? "Main photo"
                  : `Photo ${index + 1}`}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Move photo ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() =>
                    change((list) =>
                      move(list, index, index - 1)
                    )
                  }
                >
                  ←
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Move photo ${index + 1} later`}
                  disabled={index === photos.length - 1}
                  onClick={() =>
                    change((list) =>
                      move(list, index, index + 1)
                    )
                  }
                >
                  →
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() =>
                    change((list) =>
                      list.filter((_, i) => i !== index)
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Label htmlFor={inputId}>Add photos</Label>
        <Input
          id={inputId}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading || room === 0}
          onChange={(event) => {
            // copied first: clearing the input empties its list of files
            const files = [...(event.target.files ?? [])]
            // so choosing the same file again still counts
            event.target.value = ""
            void choose(files)
          }}
        />
        {uploading && (
          <p
            role="status"
            className="text-sm text-muted-foreground"
          >
            Uploading…
          </p>
        )}
        {message && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {message}
          </p>
        )}
      </div>
    </fieldset>
  )
}
