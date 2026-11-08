import { randomUUID } from "node:crypto"

import { PHOTO_TYPES, type PhotoType } from "./rules"

/** A fresh, unguessable key. The server picks it; the browser never does. */
export const newPhotoKey = (type: PhotoType) =>
  `products/${randomUUID()}.${PHOTO_TYPES[type]}`
