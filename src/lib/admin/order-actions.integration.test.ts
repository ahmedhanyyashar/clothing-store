import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { prisma } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/mailer"
import { stripe } from "@/lib/payments/stripe"
import {
  createCardOrder,
  createUser,
} from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import {
  advanceOrder,
  cancelAsAdmin,
  retryRefund,
  type Admin,
} from "./order-actions"

vi.mock("@/lib/email/mailer", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

let admin: Admin

beforeEach(async () => {
  await resetDb()
  vi.mocked(sendEmail).mockClear()
  const user = await createUser({
    name: "Ada Admin",
    email: "admin@example.com",
  })
  admin = {
    id: user.id,
    name: user.name,
    email: user.email,
  }
})
afterEach(() => vi.restoreAllMocks())

type Setup = {
  status?:
    | "PENDING"
    | "CONFIRMED"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
  method?: "CARD" | "CASH_ON_DELIVERY"
  payment?: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  quantity?: number
  intent?: string | null
}

/** An order in the given state; its stock is taken, as for a real one. */
async function orderIn({
  status = "PENDING",
  method = "CASH_ON_DELIVERY",
  payment = "PENDING",
  quantity = 3,
  intent = null,
}: Setup = {}) {
  const { order, product } = await createCardOrder(quantity)
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status,
      paymentMethod: method,
      paymentStatus: payment,
      stripeSessionId:
        method === "CARD" ? `cs_test_${order.id}` : null,
      stripePaymentIntentId: intent,
      ...(payment === "PAID" ? { paidAt: new Date() } : {}),
    },
  })
  return { order: updated, product }
}

const paidCard = (over: Setup = {}) =>
  orderIn({
    status: "CONFIRMED",
    method: "CARD",
    payment: "PAID",
    intent: `pi_${crypto.randomUUID()}`,
    ...over,
  })

const reload = (id: string) =>
  prisma.order.findUniqueOrThrow({ where: { id } })
const stockOf = async (productId: string) =>
  (
    await prisma.productSize.findFirstOrThrow({
      where: { productId, label: "M" },
    })
  ).stock
const audit = (action?: string) =>
  prisma.auditLog.findMany({
    where: action ? { action } : {},
    orderBy: { createdAt: "asc" },
  })

describe("moving an order forward", () => {
  it("confirms a pending cash order and records who did it", async () => {
    const { order } = await orderIn()

    expect(
      await advanceOrder(admin, order.number, "confirm")
    ).toEqual({ ok: true })

    expect((await reload(order.id)).status).toBe(
      "CONFIRMED"
    )
    const [entry, ...rest] = await audit()
    expect(rest).toHaveLength(0)
    expect(entry).toMatchObject({
      action: "order.confirm",
      targetType: "order",
      targetId: order.id,
      actorId: admin.id,
      actorLabel: "Ada Admin <admin@example.com>",
    })
    expect(entry.summary).toContain(order.number)
    // confirming is routine: the customer is told when it ships
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("ships a confirmed order and emails the customer", async () => {
    const { order } = await orderIn({ status: "CONFIRMED" })

    await advanceOrder(admin, order.number, "ship")

    expect((await reload(order.id)).status).toBe("SHIPPED")
    await vi.waitFor(() =>
      expect(sendEmail).toHaveBeenCalledOnce()
    )
    expect(
      vi.mocked(sendEmail).mock.lastCall![0].subject
    ).toContain("has shipped")
  })

  it("records the cash as paid when a cash order is delivered", async () => {
    const { order } = await orderIn({ status: "SHIPPED" })

    await advanceOrder(admin, order.number, "deliver")

    const after = await reload(order.id)
    expect(after).toMatchObject({
      status: "DELIVERED",
      paymentStatus: "PAID",
    })
    expect(after.paidAt).not.toBeNull()
    expect(
      (await audit("order.deliver"))[0].summary
    ).toContain("cash payment")
    await vi.waitFor(() =>
      expect(sendEmail).toHaveBeenCalled()
    )
    expect(
      vi.mocked(sendEmail).mock.lastCall![0].subject
    ).toContain("was delivered")
  })

  it("leaves a card payment as it was when the order is delivered", async () => {
    const { order } = await paidCard({ status: "SHIPPED" })
    const before = await reload(order.id)

    await advanceOrder(admin, order.number, "deliver")

    const after = await reload(order.id)
    expect(after.status).toBe("DELIVERED")
    expect(after.paidAt).toEqual(before.paidAt)
    expect(
      (await audit("order.deliver"))[0].summary
    ).not.toContain("cash")
  })

  it.each([
    ["ship", { status: "PENDING" }],
    ["deliver", { status: "CONFIRMED" }],
    ["confirm", { status: "SHIPPED" }],
    ["confirm", { status: "DELIVERED" }],
    ["ship", { status: "CANCELLED" }],
    [
      "confirm",
      {
        status: "PENDING",
        method: "CARD",
        payment: "PENDING",
      },
    ],
  ] as const)(
    "refuses to %s an order that is %o, and changes nothing",
    async (step, setup) => {
      const { order } = await orderIn(setup)

      expect(
        await advanceOrder(admin, order.number, step)
      ).toEqual({
        ok: false,
        reason: "not-allowed",
      })

      expect((await reload(order.id)).status).toBe(
        setup.status
      )
      expect(await audit()).toHaveLength(0)
      expect(sendEmail).not.toHaveBeenCalled()
    }
  )

  it("says when the order does not exist", async () => {
    expect(
      await advanceOrder(admin, "CS-NOSUCH22", "ship")
    ).toEqual({
      ok: false,
      reason: "not-found",
    })
  })

  it("ships once when two admins press the button together", async () => {
    const { order } = await orderIn({ status: "CONFIRMED" })

    const results = await Promise.all([
      advanceOrder(admin, order.number, "ship"),
      advanceOrder(admin, order.number, "ship"),
      advanceOrder(admin, order.number, "ship"),
    ])

    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(await audit("order.ship")).toHaveLength(1)
    await vi.waitFor(() =>
      expect(sendEmail).toHaveBeenCalledOnce()
    )
  })

  it("still moves an order whose customer deleted their account, without an email", async () => {
    const { order } = await orderIn({ status: "CONFIRMED" })
    await prisma.user.delete({
      where: { id: order.userId! },
    })

    expect(
      await advanceOrder(admin, order.number, "ship")
    ).toEqual({ ok: true })

    expect((await reload(order.id)).status).toBe("SHIPPED")
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe("cancelling", () => {
  it("cancels a cash order and puts the stock back", async () => {
    const { order, product } = await orderIn({
      quantity: 3,
    })
    expect(await stockOf(product.id)).toBe(7)

    expect(
      await cancelAsAdmin(admin, order.number)
    ).toEqual({ ok: true })

    expect(await reload(order.id)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "PENDING",
    })
    expect(await stockOf(product.id)).toBe(10)
    await vi.waitFor(() =>
      expect(sendEmail).toHaveBeenCalledOnce()
    )
    const text = vi.mocked(sendEmail).mock.lastCall![0].text
    expect(text).toContain("was cancelled")
    expect(text).not.toMatch(/refund/)
  })

  it("cancels an unpaid card order, marks it not paid and closes its payment page", async () => {
    const expire = vi.spyOn(
      stripe.checkout.sessions,
      "expire"
    )
    const { order, product } = await orderIn({
      method: "CARD",
    })

    await cancelAsAdmin(admin, order.number)

    expect(await reload(order.id)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "FAILED",
    })
    expect(await stockOf(product.id)).toBe(10)
    expect(expire).toHaveBeenCalledWith(
      `cs_test_${order.id}`
    )
  })

  it("cancels a paid card order, gives the money back, and records both steps", async () => {
    const refund = vi.spyOn(stripe.refunds, "create")
    const { order, product } = await paidCard({
      quantity: 3,
    })

    expect(
      await cancelAsAdmin(admin, order.number)
    ).toEqual({
      ok: true,
      refund: "refunded",
    })

    const after = await reload(order.id)
    expect(after).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "REFUNDED",
    })
    expect(after.refundedAt).not.toBeNull()
    expect(await stockOf(product.id)).toBe(10)
    expect(refund).toHaveBeenCalledWith(
      { payment_intent: order.stripePaymentIntentId },
      { idempotencyKey: `refund-${order.id}` }
    )
    expect((await audit()).map((e) => e.action)).toEqual([
      "order.cancel",
      "order.refund",
    ])
    await vi.waitFor(() =>
      expect(sendEmail).toHaveBeenCalledOnce()
    )
    expect(
      vi.mocked(sendEmail).mock.lastCall![0].text
    ).toContain("is being refunded")
  })

  it("leaves a refund that failed as owed, and a retry settles it once", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const create = vi.spyOn(stripe.refunds, "create")
    create.mockRejectedValueOnce(
      new Error("Stripe is down")
    )
    const { order } = await paidCard()

    expect(
      await cancelAsAdmin(admin, order.number)
    ).toEqual({
      ok: true,
      refund: "owed",
    })
    expect(await reload(order.id)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "PAID",
    })
    expect((await audit()).map((e) => e.action)).toEqual([
      "order.cancel",
    ])

    expect(await retryRefund(admin, order.number)).toEqual({
      ok: true,
      refund: "refunded",
    })
    expect((await reload(order.id)).paymentStatus).toBe(
      "REFUNDED"
    )
    expect((await audit()).map((e) => e.action)).toEqual([
      "order.cancel",
      "order.refund",
    ])

    // nothing is left to refund
    expect(await retryRefund(admin, order.number)).toEqual({
      ok: false,
      reason: "not-allowed",
    })
    expect(await audit("order.refund")).toHaveLength(1)
  })

  it("reports a refund as owed, instead of failing, when there is no payment to refund", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { order } = await paidCard({ intent: null })

    expect(
      await cancelAsAdmin(admin, order.number)
    ).toEqual({ ok: true, refund: "owed" })
    expect((await reload(order.id)).status).toBe(
      "CANCELLED"
    )
  })

  it("cannot cancel an order that has shipped, or one already cancelled", async () => {
    const shipped = await orderIn({
      status: "SHIPPED",
      quantity: 2,
    })
    const done = await orderIn({ status: "CANCELLED" })

    expect(
      await cancelAsAdmin(admin, shipped.order.number)
    ).toEqual({ ok: false, reason: "not-allowed" })
    expect(
      await cancelAsAdmin(admin, done.order.number)
    ).toEqual({ ok: false, reason: "not-allowed" })
    expect(await stockOf(shipped.product.id)).toBe(8)
    expect(await audit()).toHaveLength(0)
  })

  it("puts the stock back once when admins cancel together", async () => {
    const { order, product } = await orderIn({
      quantity: 3,
    })

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        cancelAsAdmin(admin, order.number)
      )
    )

    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(await stockOf(product.id)).toBe(10)
    expect(await audit("order.cancel")).toHaveLength(1)
  })

  it("never ends half shipped and half cancelled when both happen at once", async () => {
    const { order, product } = await orderIn({
      status: "CONFIRMED",
      quantity: 3,
    })

    await Promise.all([
      advanceOrder(admin, order.number, "ship"),
      cancelAsAdmin(admin, order.number),
    ])

    const after = await reload(order.id)
    if (after.status === "SHIPPED") {
      expect(await stockOf(product.id)).toBe(7)
    } else {
      expect(after.status).toBe("CANCELLED")
      expect(await stockOf(product.id)).toBe(10)
    }
    expect(await audit()).toHaveLength(1)
  })
})

describe("retrying a refund", () => {
  it("is refused for an order that is not cancelled and paid", async () => {
    const { order } = await paidCard()

    expect(await retryRefund(admin, order.number)).toEqual({
      ok: false,
      reason: "not-allowed",
    })
    expect(await retryRefund(admin, "CS-NOSUCH22")).toEqual(
      { ok: false, reason: "not-found" }
    )
  })
})
