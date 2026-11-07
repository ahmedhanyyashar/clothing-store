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
  signUpSchema,
  type SignUpInput,
} from "@/lib/auth/validations"

export function SignUpForm({
  redirectTo,
}: {
  redirectTo: string
}) {
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  })
  const [sentTo, setSentTo] = useState<string>()

  async function onSubmit(values: SignUpInput) {
    const { error } = await authClient.signUp.email({
      ...values,
      // where the verification link sends the user once it is confirmed
      callbackURL: "/sign-in",
    })
    if (error) {
      form.setError("root", {
        message:
          error.message ??
          "Something went wrong. Try again.",
      })
      return
    }
    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <div role="status" className="space-y-2 text-sm">
        <p className="font-medium">Check your email</p>
        <p className="text-muted-foreground">
          We sent a verification link to {sentTo}. It
          expires in 1 hour. Once you have confirmed your
          address you can{" "}
          <Link href="/sign-in" className="underline">
            sign in
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
              ? "Creating account…"
              : "Create account"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
