import { describe, expect, it } from "vitest"

import {
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
