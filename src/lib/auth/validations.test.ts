import { describe, expect, it } from "vitest"

import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./validations"

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "a-long-enough-password",
}

describe("signUpSchema", () => {
  it("accepts a valid sign-up", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true)
  })

  it("requires a password of at least 12 characters", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      password: "elevenchars",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a malformed email and a too-short name", () => {
    expect(
      signUpSchema.safeParse({
        ...valid,
        email: "not-an-email",
      }).success
    ).toBe(false)
    expect(
      signUpSchema.safeParse({ ...valid, name: " A " })
        .success
    ).toBe(false)
  })
})

describe("signInSchema", () => {
  it("does not apply the length rule to existing passwords", () => {
    expect(
      signInSchema.safeParse({
        email: valid.email,
        password: "short",
      }).success
    ).toBe(true)
  })

  it("requires a password", () => {
    expect(
      signInSchema.safeParse({
        email: valid.email,
        password: "",
      }).success
    ).toBe(false)
  })
})

describe("resetPasswordSchema", () => {
  it("accepts matching passwords of sufficient length", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "a-long-enough-password",
        confirmPassword: "a-long-enough-password",
      }).success
    ).toBe(true)
  })

  it("rejects passwords that do not match", () => {
    const result = resetPasswordSchema.safeParse({
      password: "a-long-enough-password",
      confirmPassword: "a-different-password",
    })

    expect(result.success).toBe(false)
  })

  it("applies the same length rule as sign-up", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "short",
        confirmPassword: "short",
      }).success
    ).toBe(false)
  })
})
