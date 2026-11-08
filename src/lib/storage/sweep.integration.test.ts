import { spawnSync } from "node:child_process"

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { prisma } from "@/lib/db/client"
import { placeOrder } from "@/lib/orders/place"
import {
  createProduct,
  createSavedAddress,
  createUser,
} from "@/test/factories"
import { photoExists, uploadTestPhoto } from "@/test/photos"
import { resetDb } from "@/test/reset-db"

import { UPLOAD_LIFETIME_MS } from "./rules"
import { sweepUnusedPhotos } from "./sweep"
import { inspectUpload } from "./uploads"

// Runs against the S3 stand-in server and the test database.

beforeEach(() => resetDb())
afterEach(() => vi.useRealTimers())

/** A cutoff in the future, so everything uploaded so far counts as old. */
const later = () => new Date(Date.now() + 60_000)

const upload = uploadTestPhoto

describe("sweepUnusedPhotos", () => {
  it("deletes an old file nothing refers to", async () => {
    const orphan = await upload()

    const { removed } = await sweepUnusedPhotos({
      before: later(),
    })

    expect(removed).toContain(orphan.key)
    expect(await photoExists(orphan.key)).toBe(false)
  })

  it("keeps a file that is too new, however unused", async () => {
    const fresh = await upload()

    const { removed } = await sweepUnusedPhotos({
      before: new Date(Date.now() - 60_000),
    })

    expect(removed).not.toContain(fresh.key)
    expect(await photoExists(fresh.key)).toBe(true)
  })

  it("keeps a file a product has", async () => {
    const photo = await upload()
    const product = await createProduct()
    await prisma.productImage.create({
      data: {
        productId: product.id,
        key: photo.key,
        url: photo.url,
        position: 5,
      },
    })

    const { removed } = await sweepUnusedPhotos({
      before: later(),
    })

    expect(removed).not.toContain(photo.key)
    expect(await photoExists(photo.key)).toBe(true)
  })

  it("keeps a file a placed order still shows", async () => {
    const photo = await upload()
    const product = await createProduct({
      images: [photo.url],
    })
    const user = await createUser()
    const address = await createSavedAddress(user.id)
    const placed = await placeOrder({
      userId: user.id,
      addressId: address.id,
      idempotencyKey: crypto.randomUUID(),
      items: [
        { productId: product.id, size: "M", quantity: 1 },
      ],
    })
    expect(placed.ok).toBe(true)
    // the product is gone; the order keeps its copy of the picture
    await prisma.product.delete({
      where: { id: product.id },
    })

    const { removed } = await sweepUnusedPhotos({
      before: later(),
    })

    expect(removed).not.toContain(photo.key)
    expect(await photoExists(photo.key)).toBe(true)
  })

  it("only reports with a dry run", async () => {
    const orphan = await upload()

    const { removed } = await sweepUnusedPhotos({
      before: later(),
      dryRun: true,
    })

    expect(removed).toContain(orphan.key)
    expect(await photoExists(orphan.key)).toBe(true)
  })

  it("goes through every page of files", async () => {
    const made = await Promise.all([
      upload(),
      upload(),
      upload(),
    ])

    const { removed } = await sweepUnusedPhotos({
      before: later(),
      pageSize: 1,
    })

    for (const photo of made)
      expect(removed).toContain(photo.key)
    expect(
      (
        await Promise.all(
          made.map((p) => photoExists(p.key))
        )
      ).filter(Boolean)
    ).toHaveLength(0)
  })
})

describe("a file too old to attach", () => {
  it("is refused by inspection, which is what makes sweeping safe", async () => {
    const photo = await upload()
    expect(await inspectUpload(photo.key)).toMatchObject({
      ok: true,
    })

    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(
      Date.now() + UPLOAD_LIFETIME_MS + 60_000
    )

    expect(await inspectUpload(photo.key)).toEqual({
      ok: false,
      reason: "expired",
    })
  })
})

describe("pnpm storage:sweep", () => {
  it("runs as an operator would run it, and reports", () => {
    const result = spawnSync(
      "pnpm",
      ["storage:sweep", "--dry-run"],
      { encoding: "utf8", shell: true, env: process.env }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(
      /Would delete \d+ of \d+ files\./
    )
  })
})
