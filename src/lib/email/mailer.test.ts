import { describe, expect, it, vi } from "vitest"

import { createMailer } from "./mailer"

describe("createMailer", () => {
  it("sends the message from the configured sender", async () => {
    const sendMail = vi.fn().mockResolvedValue({})
    const sendEmail = createMailer(
      { sendMail },
      "Shop <no-reply@shop.test>"
    )

    await sendEmail({
      to: "ada@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    })

    expect(sendMail).toHaveBeenCalledWith({
      from: "Shop <no-reply@shop.test>",
      to: "ada@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    })
  })

  it("lets a delivery failure reach the caller", async () => {
    const sendEmail = createMailer(
      {
        sendMail: vi
          .fn()
          .mockRejectedValue(new Error("refused")),
      },
      "no-reply@shop.test"
    )

    await expect(
      sendEmail({
        to: "a@b.test",
        subject: "s",
        html: "h",
        text: "t",
      })
    ).rejects.toThrow("refused")
  })
})
