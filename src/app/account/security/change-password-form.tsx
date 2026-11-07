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
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/auth/validations"

const empty: ChangePasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  signOutOtherDevices: true,
}

export function ChangePasswordForm() {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: empty,
  })
  const [done, setDone] = useState(false)

  async function onSubmit(values: ChangePasswordInput) {
    setDone(false)
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: values.signOutOtherDevices,
    })
    if (error) {
      form.setError("root", {
        message:
          error.message ??
          "Something went wrong. Try again.",
      })
      return
    }
    form.reset(empty)
    setDone(true)
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
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current password</FormLabel>
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
        <FormField
          control={form.control}
          name="newPassword"
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
        <FormField
          control={form.control}
          name="signOutOtherDevices"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  className="size-4"
                  checked={field.value}
                  onChange={(event) =>
                    field.onChange(event.target.checked)
                  }
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              </FormControl>
              <FormLabel className="font-normal">
                Sign me out on my other devices
              </FormLabel>
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
        <p role="status" className="text-sm">
          {done && "Password updated."}
        </p>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? "Saving…"
            : "Change password"}
        </Button>
      </form>
    </Form>
  )
}
