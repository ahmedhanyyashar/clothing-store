import { afterEach, describe, expect, it, vi } from "vitest"

import { photoProblem, uploadPhotos } from "./browser"
import { MAX_PHOTO_BYTES } from "./rules"

const file = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type })

afterEach(() => vi.unstubAllGlobals())

describe("photoProblem", () => {
  it("accepts a JPEG, PNG or WebP within the limit", () => {
    for (const type of [
      "image/jpeg",
      "image/png",
      "image/webp",
    ])
      expect(photoProblem(file("a", type))).toBeNull()
  })

  it("names the file and the reason otherwise", () => {
    expect(photoProblem(file("a.gif", "image/gif"))).toBe(
      "a.gif is not a JPEG, PNG or WebP image."
    )
    expect(
      photoProblem(file("e.png", "image/png", 0))
    ).toBe("e.png is empty.")
    expect(
      photoProblem(
        file("big.png", "image/png", MAX_PHOTO_BYTES + 1)
      )
    ).toBe("big.png is over 5 MB.")
  })
})

describe("uploadPhotos", () => {
  it("sends nothing for no files or an unusable one", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    expect(await uploadPhotos([])).toEqual([])
    await expect(
      uploadPhotos([file("a.gif", "image/gif")])
    ).rejects.toThrow("a.gif is not a JPEG")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("asks for forms, then posts each file to its own address with the file last", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          uploads: [
            {
              key: "products/k1.png",
              url: "http://s3/bucket",
              fields: {
                key: "products/k1.png",
                policy: "p",
              },
              publicUrl: "http://s3/bucket/products/k1.png",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        new Response(null, { status: 204 })
      )
    vi.stubGlobal("fetch", fetchMock)

    const result = await uploadPhotos([
      file("a.png", "image/png"),
    ])

    expect(result).toEqual([
      {
        key: "products/k1.png",
        url: "http://s3/bucket/products/k1.png",
        name: "a.png",
      },
    ])
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/uploads/presign"
    )
    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body)
    ).toEqual({
      files: [{ type: "image/png", size: 10 }],
    })
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe("http://s3/bucket")
    expect([...(init.body as FormData).keys()]).toEqual([
      "key",
      "policy",
      "file",
    ])
  })

  it("says what the server said when it refuses to prepare an upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "Up to 4 photos per product." },
            { status: 400 }
          )
        )
    )

    await expect(
      uploadPhotos([file("a.png", "image/png")])
    ).rejects.toThrow("Up to 4 photos per product.")
  })

  it("names the file S3 refused", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            uploads: [
              {
                key: "products/k.png",
                url: "http://s3/b",
                fields: {},
                publicUrl: "http://s3/b/products/k.png",
              },
            ],
          })
        )
        .mockResolvedValueOnce(
          new Response("no", { status: 403 })
        )
    )

    await expect(
      uploadPhotos([file("a.png", "image/png")])
    ).rejects.toThrow("a.png could not be uploaded.")
  })
})
