import { describe, expect, it } from "vitest"

import { newPhotoKey } from "./keys"
import { isPhotoKey } from "./rules"
import { sniffPhotoType } from "./sniff"

const bytes = (...values: number[]) =>
  Uint8Array.from(values)
const ascii = (text: string) =>
  Uint8Array.from(text, (c) => c.charCodeAt(0))

describe("sniffPhotoType", () => {
  it("recognises a JPEG", () => {
    expect(
      sniffPhotoType(bytes(0xff, 0xd8, 0xff, 0xe0))
    ).toBe("image/jpeg")
  })

  it("recognises a PNG", () => {
    expect(
      sniffPhotoType(
        bytes(
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a
        )
      )
    ).toBe("image/png")
  })

  it("recognises a WebP", () => {
    const webp = new Uint8Array(12)
    webp.set(ascii("RIFF"), 0)
    webp.set(ascii("WEBP"), 8)
    expect(sniffPhotoType(webp)).toBe("image/webp")
  })

  it("refuses other RIFF files such as WAV audio", () => {
    const wav = new Uint8Array(12)
    wav.set(ascii("RIFF"), 0)
    wav.set(ascii("WAVE"), 8)
    expect(sniffPhotoType(wav)).toBeNull()
  })

  it("refuses scripts, SVG, GIF and empty files", () => {
    expect(
      sniffPhotoType(ascii('<svg xmlns="x"/>'))
    ).toBeNull()
    expect(
      sniffPhotoType(ascii("<script>1</script>"))
    ).toBeNull()
    expect(sniffPhotoType(ascii("GIF89a......"))).toBeNull()
    expect(sniffPhotoType(new Uint8Array())).toBeNull()
  })
})

describe("photo keys", () => {
  it("makes a key with the right extension that passes its own check", () => {
    const key = newPhotoKey("image/png")
    expect(key).toMatch(/^products\/.+\.png$/)
    expect(isPhotoKey(key)).toBe(true)
    expect(newPhotoKey("image/png")).not.toBe(key)
  })

  it("accepts nothing but its own shape", () => {
    for (const key of [
      "",
      "products/../secret.png",
      "other/0b1b6f0e-5a3e-4c1f-9d2a-1f0e5a3e4c1f.png",
      "products/0b1b6f0e-5a3e-4c1f-9d2a-1f0e5a3e4c1f.svg",
      "products/0b1b6f0e-5a3e-4c1f-9d2a-1f0e5a3e4c1f.png/x",
      "products/x.png",
    ])
      expect(isPhotoKey(key)).toBe(false)
  })
})
