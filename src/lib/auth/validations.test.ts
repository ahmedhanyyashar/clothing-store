import { describe, expect, it } from "vitest"

import {
  changePasswordSchema,
  deleteAccountSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
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

describe("updateProfileSchema", () => {
  it("trims the name and keeps it between 2 and 100 characters", () => {
    expect(
      updateProfileSchema.parse({ name: "  Ada King " })
    ).toEqual({
      name: "Ada King",
    })
    expect(
      updateProfileSchema.safeParse({ name: "A" }).success
    ).toBe(false)
    expect(
      updateProfileSchema.safeParse({
        name: "x".repeat(101),
      }).success
    ).toBe(false)
  })
})

describe("changePasswordSchema", () => {
  const valid = {
    currentPassword: "the-old-password-1",
    newPassword: "a-brand-new-password",
    confirmPassword: "a-brand-new-password",
    signOutOtherDevices: true,
  }

  it("accepts a valid change", () => {
    expect(
      changePasswordSchema.safeParse(valid).success
    ).toBe(true)
  })

  it.each([
    [
      "no current password",
      { currentPassword: "" },
      "currentPassword",
    ],
    [
      "a short new password",
      { newPassword: "short", confirmPassword: "short" },
      "newPassword",
    ],
    [
      "a confirmation that differs",
      { confirmPassword: "different-password!" },
      "confirmPassword",
    ],
    [
      "the same password as before",
      {
        newPassword: "the-old-password-1",
        confirmPassword: "the-old-password-1",
      },
      "newPassword",
    ],
  ])("rejects %s", (_why, change, field) => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      ...change,
    })

    expect(result.success).toBe(false)
    expect(
      result.error?.issues.map((i) => i.path[0])
    ).toContain(field)
  })
})

describe("deleteAccountSchema", () => {
  it("only needs a password to be present", () => {
    expect(
      deleteAccountSchema.safeParse({ password: "x" })
        .success
    ).toBe(true)
    expect(
      deleteAccountSchema.safeParse({ password: "" })
        .success
    ).toBe(false)
  })
})
