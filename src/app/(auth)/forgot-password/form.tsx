"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

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
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/auth/validations"

export function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })
  const [sentTo, setSentTo] = useState<string>()

  async function onSubmit({ email }: ForgotPasswordInput) {
    const { error } = await authClient.requestPasswordReset(
      {
        email,
        redirectTo: "/reset-password",
      }
    )
    if (error) {
      form.setError("root", {
        message:
          error.message ??
          "Something went wrong. Try again.",
      })
      return
    }
    setSentTo(email)
  }

  if (sentTo) {
    // the same message whether or not the address has an account
    return (
      <div role="status" className="space-y-2 text-sm">
        <p className="font-medium">Check your email</p>
        <p className="text-muted-foreground">
          If an account exists for {sentTo}, we sent a link
          to reset the password. It expires in 1 hour.
        </p>
      </div>
    )
  }

  return (
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

        {form.formState.errors.root && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {form.formState.errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? "Sending…"
            : "Send reset link"}
        </Button>
      </form>
    </Form>
  )
}
