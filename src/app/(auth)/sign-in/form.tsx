"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { GoogleSignIn } from "@/components/auth/GoogleSignIn"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"
import {
  signInSchema,
  type SignInInput,
} from "@/lib/auth/validations"

export function SignInForm({
  redirectTo,
  notice,
}: {
  redirectTo: string
  notice?: string
}) {
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })
  // set when the account exists but its email address is not confirmed yet
  const [unverifiedEmail, setUnverifiedEmail] =
    useState<string>()
  const [resent, setResent] = useState(false)

  async function onSubmit(values: SignInInput) {
    setUnverifiedEmail(undefined)
    setResent(false)

    const { error } = await authClient.signIn.email({
      ...values,
      callbackURL: redirectTo,
    })
    if (!error) return

    if (error.code === "EMAIL_NOT_VERIFIED") {
      setUnverifiedEmail(values.email)
      return
    }
    form.setError("root", {
      message:
        error.message ?? "Something went wrong. Try again.",
    })
  }

  async function resend(email: string) {
    await authClient.sendVerificationEmail({
      email,
      callbackURL: "/sign-in",
    })
    setResent(true)
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {notice}
        </p>
      )}

      <GoogleSignIn redirectTo={redirectTo} />

      <Form {...form}>
        <form
          noValidate
          onSubmit={(event) =>
            void form.handleSubmit(onSubmit)(event)
          }
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <p className="text-right text-sm">
            <Link
              href="/forgot-password"
              className="underline"
            >
              Forgot your password?
            </Link>
          </p>

          {form.formState.errors.root && (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {form.formState.errors.root.message}
            </p>
          )}

          {unverifiedEmail && (
            <div role="alert" className="space-y-2 text-sm">
              <p>
                Confirm your email address before signing
                in. We sent a link to {unverifiedEmail}.
              </p>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                disabled={resent}
                onClick={() => void resend(unverifiedEmail)}
              >
                {resent
                  ? "Link sent"
                  : "Send the link again"}
              </Button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Signing in…"
              : "Sign in"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
