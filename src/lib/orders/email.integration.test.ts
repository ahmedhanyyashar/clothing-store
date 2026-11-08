import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { prisma } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/mailer"
import { createCardOrder } from "@/test/factories"
import { resetDb } from "@/test/reset-db"

import { sendOrderConfirmation } from "./email"

vi.mock("@/lib/email/mailer", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(async () => {
  await resetDb()
  vi.mocked(sendEmail).mockClear()
})

describe("sendOrderConfirmation", () => {
  it("says a card order is paid, and lists what was ordered", async () => {
    const { order, user } = await createCardOrder(2)

    await sendOrderConfirmation(order.id)

    const message = vi.mocked(sendEmail).mock.lastCall![0]
    expect(message.to).toBe(user.email)
    expect(message.subject).toBe(
      `Your Clothing Store order ${order.number}`
    )
    expect(message.text).toContain("2 × Product")
    expect(message.text).toContain("paid by card")
    expect(message.text).not.toContain("cash on delivery")
  })

  it("tells a cash customer to pay on delivery", async () => {
    const { order } = await createCardOrder()
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentMethod: "CASH_ON_DELIVERY" },
    })

    await sendOrderConfirmation(order.id)

    expect(
      vi.mocked(sendEmail).mock.lastCall![0].text
    ).toContain("pay in cash on delivery")
  })

  it("sends nothing when the account is gone", async () => {
    const { order, user } = await createCardOrder()
    await prisma.user.delete({ where: { id: user.id } })

    await sendOrderConfirmation(order.id)

    expect(sendEmail).not.toHaveBeenCalled()
  })
})
