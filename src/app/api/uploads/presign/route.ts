import { NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth/session"
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  PHOTO_TYPES,
} from "@/lib/storage/rules"
import { createUpload } from "@/lib/storage/uploads"

const photoTypes = Object.keys(PHOTO_TYPES) as [
  keyof typeof PHOTO_TYPES,
  ...(keyof typeof PHOTO_TYPES)[],
]

const requestSchema = z.object({
  files: z
    .array(
      z.object({
        type: z.enum(photoTypes, {
          message: "Photos must be JPEG, PNG or WebP.",
        }),
        size: z
          .number()
          .int()
          .min(1, "That file is empty.")
          .max(
            MAX_PHOTO_BYTES,
            `Photos can be up to ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`
          ),
      })
    )
    .min(1)
    .max(
      MAX_PHOTOS,
      `Up to ${MAX_PHOTOS} photos per product.`
    ),
})

/**
 * Hands an admin one upload form per photo. Anyone else, signed in or not, gets
 * a plain 404, so the route does not show itself to them.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (session?.user.role !== "ADMIN")
    return new NextResponse(null, { status: 404 })

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "That is not a valid upload request.",
      },
      { status: 400 }
    )
  }

  const uploads = await Promise.all(
    parsed.data.files.map((file) => createUpload(file.type))
  )
  return NextResponse.json({ uploads })
}
