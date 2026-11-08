// What a product photo may be. Plain data with no imports, so the browser and
// the server read the same limits.
export const MAX_PHOTOS = 4
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
