// What a product photo may be. Plain data with no imports, so the browser and
// the server read the same limits.
export const MAX_PHOTOS = 4
/**
 * How long an uploaded photo can wait to be attached to a product. It is
 * shorter than the time the sweep waits before deleting an unused file, so a
 * file old enough to be swept can no longer be attached.
 */
export const UPLOAD_LIFETIME_MS = 12 * 60 * 60 * 1000
export const SWEEP_AFTER_MS = 24 * 60 * 60 * 1000

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export const PHOTO_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

export type PhotoType = keyof typeof PHOTO_TYPES

export const isPhotoType = (
  type: string
): type is PhotoType => Object.hasOwn(PHOTO_TYPES, type)

const KEY = /^products\/[0-9a-f-]{36}\.(jpg|png|webp)$/

/** Whether a key has the shape `newPhotoKey` makes, and nothing else. */
export const isPhotoKey = (key: string) => KEY.test(key)
