import { describe, expect, it } from "vitest"

import { getSafeRedirect } from "./utils"

describe("getSafeRedirect", () => {
  it("keeps a path on this site", () => {
    expect(getSafeRedirect("/orders?page=2")).toBe(
      "/orders?page=2"
    )
  })

  it.each([
    ["an absolute URL", "https://evil.example/phish"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash trick", "/\\evil.example"],
    ["a relative path", "orders"],
    ["nothing", null],
    ["an empty string", ""],
  ])("falls back for %s", (_label, value) => {
    expect(getSafeRedirect(value)).toBe("/")
  })

  it("uses the given fallback", () => {
    expect(getSafeRedirect(null, "/account")).toBe(
      "/account"
    )
  })
})
