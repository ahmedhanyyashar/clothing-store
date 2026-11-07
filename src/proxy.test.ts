import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { proxy } from "./proxy"

function request(path: string, signedIn = false) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: signedIn
      ? { cookie: "better-auth.session_token=abc" }
      : undefined,
  })
}

describe("proxy", () => {
  it("sends a signed-out visitor from a protected page to sign in", () => {
    const response = proxy(request("/account?tab=security"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/sign-in?redirect=%2Faccount%3Ftab%3Dsecurity"
    )
  })

  it("lets a visitor with a session cookie reach a protected page", () => {
    const response = proxy(request("/account", true))

    expect(response.headers.get("location")).toBeNull()
  })

  it("sends a signed-in visitor away from the sign-in and sign-up pages", () => {
    for (const path of ["/sign-in", "/sign-up"]) {
      const response = proxy(request(path, true))

      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/"
      )
    }
  })

  it("leaves other pages alone", () => {
    expect(
      proxy(request("/sign-in")).headers.get("location")
    ).toBeNull()
    expect(
      proxy(request("/accounting")).headers.get("location")
    ).toBeNull()
  })
})
