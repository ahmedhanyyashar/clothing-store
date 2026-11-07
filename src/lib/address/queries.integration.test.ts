import { beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/client"
import { resetDb } from "@/test/reset-db"

import {
  createAddress,
  deleteAddress,
  getAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "./queries"
import {
  MAX_ADDRESSES,
  type NormalizedAddress,
} from "./validations"

const data = (
  overrides: Partial<NormalizedAddress> = {}
): NormalizedAddress => ({
  label: null,
  fullName: "Ada Lovelace",
  phone: "+12025550123",
  line1: "1 Main St",
  line2: null,
  city: "Washington",
  region: "District of Columbia",
  postalCode: "20500",
  country: "US",
  notes: null,
  isDefault: false,
  ...overrides,
})

async function makeUser(id: string) {
  return prisma.user.create({
    data: {
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: true,
    },
  })
}

async function add(
  userId: string,
  overrides: Partial<NormalizedAddress> = {}
) {
  const result = await createAddress(
    userId,
    data(overrides)
  )
  if (!result.ok) throw new Error("not created")
  return result.address
}

const defaults = async (userId: string) =>
  (await listAddresses(userId)).filter((a) => a.isDefault)

beforeEach(async () => {
  await resetDb()
  await makeUser("ada")
  await makeUser("bob")
})

describe("defaults", () => {
  it("makes the first address the default, whatever was asked", async () => {
    const first = await add("ada", { isDefault: false })

    expect(first.isDefault).toBe(true)
  })

  it("moves the default when a later address asks for it", async () => {
    const first = await add("ada")
    const second = await add("ada", { isDefault: true })

    const list = await listAddresses("ada")
    expect(list.map((a) => a.id)).toEqual([
      second.id,
      first.id,
    ])
    expect(await defaults("ada")).toHaveLength(1)
  })

  it("keeps the default when a later address does not ask", async () => {
    const first = await add("ada")
    await add("ada")

    expect(
      (await defaults("ada")).map((a) => a.id)
    ).toEqual([first.id])
  })

  it("moves the default on request, and an unchecked box cannot remove it", async () => {
    const first = await add("ada")
    const second = await add("ada")

    expect(await setDefaultAddress("ada", second.id)).toBe(
      true
    )
    expect(
      (await defaults("ada")).map((a) => a.id)
    ).toEqual([second.id])

    const kept = await updateAddress(
      "ada",
      second.id,
      data({ isDefault: false })
    )
    expect(kept?.isDefault).toBe(true)
    expect(first.id).not.toBe(second.id)
  })

  it("promotes the newest address when the default is deleted", async () => {
    const first = await add("ada")
    const second = await add("ada")
    const third = await add("ada")

    await deleteAddress("ada", first.id)

    expect(
      (await defaults("ada")).map((a) => a.id)
    ).toEqual([third.id])
    expect(second.id).not.toBe(third.id)
  })

  it("never leaves two defaults, even when requests race", async () => {
    await add("ada")

    await Promise.all(
      Array.from({ length: 6 }, () =>
        add("ada", { isDefault: true })
      )
    )

    expect(
      await prisma.address.count({
        where: { userId: "ada" },
      })
    ).toBe(7)
    expect(await defaults("ada")).toHaveLength(1)
  })

  it("is enforced by the database as well", async () => {
    await add("ada")
    const second = await add("ada")

    await expect(
      prisma.address.update({
        where: { id: second.id },
        data: { isDefault: true },
      })
    ).rejects.toThrow()
  })
})

describe("limit", () => {
  it("refuses an address beyond the limit", async () => {
    for (let i = 0; i < MAX_ADDRESSES; i++) await add("ada")

    const result = await createAddress("ada", data())

    expect(result).toEqual({ ok: false, reason: "limit" })
  })

  it("holds when requests race", async () => {
    await Promise.all(
      Array.from({ length: MAX_ADDRESSES + 5 }, () =>
        createAddress("ada", data())
      )
    )

    expect(
      await prisma.address.count({
        where: { userId: "ada" },
      })
    ).toBe(MAX_ADDRESSES)
  })
})

describe("ownership", () => {
  it("lists only the user's own addresses", async () => {
    await add("ada")
    await add("bob")

    expect(await listAddresses("ada")).toHaveLength(1)
  })

  it("does not find, change, delete or default someone else's address", async () => {
    const adas = await add("ada")

    expect(await getAddress("bob", adas.id)).toBeNull()
    expect(
      await updateAddress(
        "bob",
        adas.id,
        data({ fullName: "Mallory" })
      )
    ).toBeNull()
    expect(await deleteAddress("bob", adas.id)).toBe(false)
    expect(await setDefaultAddress("bob", adas.id)).toBe(
      false
    )

    const unchanged = await getAddress("ada", adas.id)
    expect(unchanged?.fullName).toBe("Ada Lovelace")
  })

  it("does not touch another user's default", async () => {
    const adas = await add("ada")
    await add("bob")
    const bobs2 = await add("bob")

    await setDefaultAddress("bob", bobs2.id)

    expect(
      (await defaults("ada")).map((a) => a.id)
    ).toEqual([adas.id])
  })
})

describe("updating and deleting", () => {
  it("changes the fields of an address", async () => {
    const address = await add("ada")

    const updated = await updateAddress(
      "ada",
      address.id,
      data({ city: "Boston", notes: "Ring twice" })
    )

    expect(updated).toMatchObject({
      city: "Boston",
      notes: "Ring twice",
    })
  })

  it("is removed along with the account", async () => {
    await add("ada")

    await prisma.user.delete({ where: { id: "ada" } })

    expect(
      await prisma.address.count({
        where: { userId: "ada" },
      })
    ).toBe(0)
  })

  it("answers false for an address that does not exist", async () => {
    expect(await deleteAddress("ada", "nope")).toBe(false)
  })
})
