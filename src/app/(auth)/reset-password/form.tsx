"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
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
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/auth/validations"

export function ResetPasswordForm({
  token,
}: {
  token: string
}) {
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })
  const [done, setDone] = useState(false)

  async function onSubmit({
    password,
  }: ResetPasswordInput) {
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    })
    if (error) {
      form.setError("root", {
        message:
          error.message ??
          "Something went wrong. Try again.",
      })
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div role="status" className="space-y-2 text-sm">
        <p className="font-medium">Password updated</p>
        <p className="text-muted-foreground">
          You have been signed out everywhere.{" "}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>{" "}
          with your new password.
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
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
            ? "Saving…"
            : "Set new password"}
        </Button>
      </form>
    </Form>
  )
}
