import type { PhotoType } from "./rules"

/** How many leading bytes `sniffPhotoType` needs. */
export const SNIFF_BYTES = 12

/**
 * The real type of an image, read from its first bytes. The type a browser
 * sends and the file name are only claims; these signatures are the file.
 */
export function sniffPhotoType(
  bytes: Uint8Array
): PhotoType | null {
  const at = (i: number) => bytes[i]
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff)
    return "image/jpeg"
  if (
    at(0) === 0x89 &&
    at(1) === 0x50 &&
    at(2) === 0x4e &&
    at(3) === 0x47 &&
    at(4) === 0x0d &&
    at(5) === 0x0a &&
    at(6) === 0x1a &&
    at(7) === 0x0a
  )
    return "image/png"
  const text = (from: number, to: number) =>
    String.fromCharCode(...bytes.slice(from, to))
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP")
    return "image/webp"
  return null
}
