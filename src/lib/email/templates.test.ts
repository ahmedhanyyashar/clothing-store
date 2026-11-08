import { describe, expect, it } from "vitest"

import {
  orderConfirmationEmail,
  orderStatusEmail,
  passwordChangedEmail,
  passwordResetEmail,
  verificationEmail,
} from "./templates"

const url = "https://shop.test/verify?token=abc&next=%2F"

describe("email templates", () => {
  it.each([
    ["verification", verificationEmail],
    ["password reset", passwordResetEmail],
  ])(
    "%s email carries the link in both formats",
    (_name, build) => {
      const { subject, html, text } = build({
        name: "Ada",
        url,
      })

      expect(subject).toMatch(/Clothing Store/)
      expect(text).toContain(url)
      // in HTML the ampersand in the query string is escaped
      expect(html).toContain("token=abc&amp;next=%2F")
      expect(html).toContain("Hi Ada,")
    }
  )

  it("escapes the user's name in HTML", () => {
    const { html, text } = verificationEmail({
      name: `<script>alert("x")</script>`,
      url,
    })

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(text).toContain(`<script>alert("x")</script>`)
  })
})

describe("password changed email", () => {
  const email = passwordChangedEmail({
    name: "Ada",
    resetUrl: "https://shop.test/forgot-password",
  })

  it("says what happened and links to a reset in case it was not the owner", () => {
    expect(email.subject).toBe(
      "Your Clothing Store password was changed"
    )
    expect(email.text).toContain(
      "https://shop.test/forgot-password"
    )
    expect(email.html).toContain(
      "https://shop.test/forgot-password"
    )
  })

  it("does not claim that the link expires", () => {
    expect(email.text).not.toMatch(/expires/)
  })
})

describe("order confirmation email", () => {
  const email = orderConfirmationEmail({
    name: "Ada",
    number: "CS-7K2M9QXD",
    url: "https://shop.test/account/orders/CS-7K2M9QXD",
    items: ["2 × Classic Tee (M): $49.98"],
    totals: [
      "Subtotal: $49.98",
      "Shipping: $5.00",
      "Total: $54.98",
    ],
    address: ["Ada Lovelace", "1 Main St", "Austin"],
  })

  it("puts the number in the subject and the items, totals and address in the body", () => {
    expect(email.subject).toBe(
      "Your Clothing Store order CS-7K2M9QXD"
    )
    for (const part of [
      "2 × Classic Tee (M): $49.98",
      "Total: $54.98",
      "1 Main St",
      "https://shop.test/account/orders/CS-7K2M9QXD",
    ]) {
      expect(email.text).toContain(part)
      expect(email.html).toContain(part)
    }
  })

  it("escapes what a customer typed", () => {
    const { html } = orderConfirmationEmail({
      name: "Ada",
      number: "CS-7K2M9QXD",
      url: "https://shop.test/o",
      items: [],
      totals: [],
      address: ['<img src=x onerror="alert(1)">'],
    })

    expect(html).not.toContain("<img")
    expect(html).toContain("&lt;img")
  })
})

describe("order status email", () => {
  const send = (
    status: "SHIPPED" | "DELIVERED" | "CANCELLED",
    refund: string | null = null
  ) =>
    orderStatusEmail({
      name: "Ada",
      number: "CS-7K2M9QXD",
      status,
      url: "https://shop.test/account/orders/CS-7K2M9QXD",
      refund,
    })

  it.each([
    ["SHIPPED", "has shipped"],
    ["DELIVERED", "was delivered"],
    ["CANCELLED", "was cancelled"],
  ] as const)(
    "says in the subject that the order %s",
    (status, words) => {
      expect(send(status).subject).toBe(
        `Your Clothing Store order CS-7K2M9QXD ${words}`
      )
    }
  )

  it("links to the order in both formats", () => {
    const { text, html } = send("SHIPPED")

    expect(text).toContain(
      "https://shop.test/account/orders/CS-7K2M9QXD"
    )
    expect(html).toContain(
      "https://shop.test/account/orders/CS-7K2M9QXD"
    )
  })

  it("mentions the refund only for a cancelled order that had been paid", () => {
    expect(send("CANCELLED", "$54.98").text).toContain(
      "$54.98 is being refunded to your card"
    )
    expect(send("CANCELLED").text).not.toMatch(/refund/)
    expect(send("SHIPPED", "$54.98").text).not.toMatch(
      /refund/
    )
  })
})
