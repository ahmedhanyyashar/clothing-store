import { randomUUID } from "node:crypto"

import { PHOTO_TYPES, type PhotoType } from "./rules"

const PREFIX = "products/"
const KEY = /^products\/[0-9a-f-]{36}\.(jpg|png|webp)$/

/** A fresh, unguessable key. The server picks it; the browser never does. */
export const newPhotoKey = (type: PhotoType) =>
  `${PREFIX}${randomUUID()}.${PHOTO_TYPES[type]}`

/** Whether a key has the shape `newPhotoKey` makes, and nothing else. */
export const isPhotoKey = (key: string) => KEY.test(key)
