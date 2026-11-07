import { z } from "zod"

/** Also enforced by the auth server, which is the check that counts. */
export const PASSWORD_MIN_LENGTH = 12

const email = z.email("Enter a valid email address")

const name = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters")

const newPassword = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  )

export const signInSchema = z.object({
  email,
  // Only presence is checked: a rule change must never lock out an existing user
  password: z.string().min(1, "Enter your password"),
})

export const signUpSchema = z.object({
  name,
  email,
  password: newPassword,
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  )

export const updateProfileSchema = z.object({ name })

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your current password"),
    newPassword,
    confirmPassword: z.string(),
    signOutOtherDevices: z.boolean(),
  })
  .refine(
    (values) =>
      values.newPassword === values.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  )
  .refine(
    (values) =>
      values.newPassword !== values.currentPassword,
    {
      message:
        "Choose a password different from the current one",
      path: ["newPassword"],
    }
  )

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password"),
})

export type UpdateProfileInput = z.infer<
  typeof updateProfileSchema
>
export type ChangePasswordInput = z.infer<
  typeof changePasswordSchema
>
export type DeleteAccountInput = z.infer<
  typeof deleteAccountSchema
>
export type ForgotPasswordInput = z.infer<
  typeof forgotPasswordSchema
>
export type ResetPasswordInput = z.infer<
  typeof resetPasswordSchema
>
