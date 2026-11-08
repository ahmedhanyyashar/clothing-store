import { describe, expect, it } from "vitest"

import { isDemoRecipient } from "./mailer"

describe("isDemoRecipient", () => {
  it("is true for the demo domain, whatever the case", () => {
    expect(
      isDemoRecipient("demo@clothing-store.example")
    ).toBe(true)
    expect(
      isDemoRecipient("Maya.Patel@Clothing-Store.Example")
    ).toBe(true)
  })

  it("is false for any other address, including look-alikes", () => {
    expect(isDemoRecipient("ada@example.com")).toBe(false)
    expect(
      isDemoRecipient("x@evil-clothing-store.example.com")
    ).toBe(false)
  })
})
