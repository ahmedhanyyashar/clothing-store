import { z } from "zod"

/** Also enforced by the auth server, which is the check that counts. */
export const PASSWORD_MIN_LENGTH = 12

const email = z.email("Enter a valid email address")

export const signInSchema = z.object({
  email,
  // Only presence is checked: a rule change must never lock out an existing user
  password: z.string().min(1, "Enter your password"),
})

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters"),
  email,
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    ),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
      ),
    confirmPassword: z.string(),
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  )

export type ForgotPasswordInput = z.infer<
  typeof forgotPasswordSchema
>
export type ResetPasswordInput = z.infer<
  typeof resetPasswordSchema
>
