import { HeadObjectCommand } from "@aws-sdk/client-s3"
import { afterAll, describe, expect, it } from "vitest"

import { BUCKET, s3 } from "./client"
import { MAX_PHOTO_BYTES } from "./rules"
import {
  createUpload,
  deleteObjects,
  inspectUpload,
} from "./uploads"

// Runs against the S3 stand-in server from docker/compose.yaml.

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0,
  0,
])
const created: string[] = []

async function post(
  upload: Awaited<ReturnType<typeof createUpload>>,
  file: BlobPart,
  type: string = upload.fields["Content-Type"]
) {
  const form = new FormData()
  for (const [name, value] of Object.entries(upload.fields))
    form.append(name, value)
  // the type a hostile client sends can differ from the one that was signed
  form.set("Content-Type", type)
  form.append("file", new Blob([file], { type }))
  created.push(upload.key)
  return fetch(upload.url, { method: "POST", body: form })
}

const exists = (key: string) =>
  s3
    .send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    )
    .then(
      () => true,
      () => false
    )

afterAll(() => deleteObjects(created))

describe("uploading a photo", () => {
  it("stores a good photo, and it passes inspection", async () => {
    const upload = await createUpload("image/png")
    const response = await post(upload, PNG)
    expect(response.status).toBeLessThan(300)

    expect(await inspectUpload(upload.key)).toEqual({
      ok: true,
      type: "image/png",
      size: PNG.length,
    })
    expect(upload.publicUrl).toContain(upload.key)
  })

  it("is refused by S3 when the file is over the size limit", async () => {
    const upload = await createUpload("image/png")
    const response = await post(
      upload,
      new Uint8Array(MAX_PHOTO_BYTES + 1)
    )
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(await exists(upload.key)).toBe(false)
  })

  it("is refused by S3 when it is empty", async () => {
    const upload = await createUpload("image/png")
    const response = await post(upload, new Uint8Array())
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(await exists(upload.key)).toBe(false)
  })

  it("is refused by S3 when the type is not the one asked for", async () => {
    const upload = await createUpload("image/png")
    const response = await post(upload, PNG, "text/html")
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(await exists(upload.key)).toBe(false)
  })

  it("makes a different key every time", async () => {
    const [a, b] = await Promise.all([
      createUpload("image/jpeg"),
      createUpload("image/jpeg"),
    ])
    expect(a.key).not.toBe(b.key)
  })
})

describe("inspectUpload", () => {
  it("says an object that was never uploaded is missing", async () => {
    const upload = await createUpload("image/png")
    expect(await inspectUpload(upload.key)).toEqual({
      ok: false,
      reason: "missing",
    })
  })

  it("says a key of another shape is missing without asking S3", async () => {
    expect(await inspectUpload("../etc/passwd")).toEqual({
      ok: false,
      reason: "missing",
    })
  })

  it("catches a file that claims to be a photo and is not", async () => {
    const upload = await createUpload("image/png")
    const text = new TextEncoder().encode(
      "<script>alert(1)</script>"
    )
    const response = await post(upload, text)
    expect(response.status).toBeLessThan(300)

    expect(await inspectUpload(upload.key)).toEqual({
      ok: false,
      reason: "not-a-photo",
    })
  })
})

describe("deleteObjects", () => {
  it("removes what was stored, and ignores what was not", async () => {
    const upload = await createUpload("image/png")
    await post(upload, PNG)
    expect(await exists(upload.key)).toBe(true)

    await deleteObjects([
      upload.key,
      "products/never-existed.png",
    ])
    expect(await exists(upload.key)).toBe(false)
  })

  it("does nothing for an empty list", async () => {
    await expect(deleteObjects([])).resolves.toBeUndefined()
  })
})
