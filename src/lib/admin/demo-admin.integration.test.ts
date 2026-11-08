import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { prisma } from "@/lib/db/client"
import { DEMO_READ_ONLY } from "@/lib/demo/accounts"
import {
  createCardOrder,
  createProduct,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { orderAction } from "./actions"
import {
  deleteProductAction,
  saveProductAction,
} from "./product-actions"

// The demo admin sees every admin screen and may change none of it. The pages
// are open to it (it is an admin), so the refusal is in each action.

const asUser = vi.hoisted(() => ({
  current: null as null | {
    id: string
    name: string
    email: string
    role: "ADMIN"
    isDemo: boolean
  },
}))
vi.mock("@/lib/auth/session", () => ({
  requireRole: vi.fn(async () => asUser.current),
}))

beforeEach(async () => {
  await resetDb()
  const user = await createUser({
    email: "demo-admin@x.example",
  })
  asUser.current = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "ADMIN",
    isDemo: true,
  }
})

describe("the demo admin", () => {
  it("cannot confirm, ship, deliver, cancel or refund an order", async () => {
    const { order } = await createCardOrder(1)

    for (const action of [
      "confirm",
      "ship",
      "deliver",
      "cancel",
      "refund",
    ]) {
      expect(
        await orderAction(order.number, action)
      ).toEqual({
        ok: false,
        message: DEMO_READ_ONLY,
      })
    }

    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    })
    expect(after.status).toBe(order.status)
    expect(await prisma.auditLog.count()).toBe(0)
  })

  it("cannot add, change or delete a product", async () => {
    const product = await createProduct({ name: "Keep Me" })

    const added = await saveProductAction(null, {
      name: "New Tee",
      description: "A tee.",
      price: "10.00",
      category: "MEN",
      type: "T_SHIRTS",
      bestSeller: false,
      sizes: [
        { label: "M", stock: 3, expectedStock: null },
      ],
      photos: [],
      colors: [],
    })
    const changed = await saveProductAction(product.id, {
      name: "Renamed",
      description: "A tee.",
      price: "10.00",
      category: "MEN",
      type: "T_SHIRTS",
      bestSeller: false,
      sizes: [{ label: "M", stock: 3, expectedStock: 5 }],
      photos: [],
      colors: [],
    })
    const deleted = await deleteProductAction(product.id)

    for (const result of [added, changed, deleted])
      expect(result).toEqual({
        ok: false,
        message: DEMO_READ_ONLY,
      })
    expect(await prisma.product.count()).toBe(1)
    expect(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: product.id },
        })
      ).name
    ).toBe("Keep Me")
  })

  it("an ordinary admin is not affected", async () => {
    asUser.current = { ...asUser.current!, isDemo: false }
    const product = await createProduct({
      name: "Change Me",
    })

    const result = await deleteProductAction(product.id)

    expect(result).toEqual({ ok: true })
  })
})
