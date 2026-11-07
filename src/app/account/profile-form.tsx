"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
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
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/auth/validations"

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter()
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name },
  })
  const [saved, setSaved] = useState(false)

  async function onSubmit(values: UpdateProfileInput) {
    setSaved(false)
    const { error } = await authClient.updateUser(values)
    if (error) {
      form.setError("root", {
        message:
          error.message ??
          "Something went wrong. Try again.",
      })
      return
    }
    form.reset(values)
    setSaved(true)
    // pages rendered on the server pick up the new name
    router.refresh()
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

        {form.formState.errors.root && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {form.formState.errors.root.message}
          </p>
        )}
        <p role="status" className="text-sm">
          {saved && "Saved."}
        </p>

        <Button
          type="submit"
          disabled={
            form.formState.isSubmitting ||
            !form.formState.isDirty
          }
        >
          {form.formState.isSubmitting
            ? "Saving…"
            : "Save changes"}
        </Button>
      </form>
    </Form>
  )
}
