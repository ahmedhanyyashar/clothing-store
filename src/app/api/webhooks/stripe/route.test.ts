import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { env } from "@/env"
import { stripe } from "@/lib/payments/stripe"
import {
  handleStripeEvent,
  PaymentMismatchError,
} from "@/lib/payments/webhook"

import { POST } from "./route"

vi.mock(
  "@/lib/payments/webhook",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/lib/payments/webhook")
    >()),
    handleStripeEvent: vi.fn(),
  })
)

const payload = JSON.stringify({
  id: "evt_1",
  object: "event",
  type: "checkout.session.completed",
  data: { object: {} },
})

/** A request as Stripe sends it: signed over the exact body. */
function request(
  body = payload,
  secret: string = env.STRIPE_WEBHOOK_SECRET
) {
  const signature =
    stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret,
    })
  return new Request(
    "http://localhost/api/webhooks/stripe",
    {
      method: "POST",
      body,
      headers: { "stripe-signature": signature },
    }
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("POST /api/webhooks/stripe", () => {
  it("refuses a request with no signature", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: payload,
      })
    )

    expect(response.status).toBe(400)
    expect(handleStripeEvent).not.toHaveBeenCalled()
  })

  it("refuses a signature made with another secret", async () => {
    const response = await POST(
      request(payload, "whsec_someone_else")
    )

    expect(response.status).toBe(400)
    expect(handleStripeEvent).not.toHaveBeenCalled()
  })

  it("refuses a body that was changed after it was signed", async () => {
    const signed = request()
    const tampered = new Request(signed.url, {
      method: "POST",
      headers: signed.headers,
      body: payload.replace("evt_1", "evt_2"),
    })

    const response = await POST(tampered)

    expect(response.status).toBe(400)
    expect(handleStripeEvent).not.toHaveBeenCalled()
  })

  it("hands a correctly signed event to the handler", async () => {
    vi.mocked(handleStripeEvent).mockResolvedValue({
      outcome: "processed",
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(handleStripeEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt_1" })
    )
  })

  it("answers with an error when handling fails, so Stripe sends it again", async () => {
    vi.mocked(handleStripeEvent).mockRejectedValue(
      new Error("db down")
    )

    const response = await POST(request())

    expect(response.status).toBe(500)
  })

  it("does not ask Stripe to send a payment again that can never match its order", async () => {
    vi.mocked(handleStripeEvent).mockRejectedValue(
      new PaymentMismatchError("wrong amount")
    )

    const response = await POST(request())

    expect(response.status).toBe(200)
  })
})
