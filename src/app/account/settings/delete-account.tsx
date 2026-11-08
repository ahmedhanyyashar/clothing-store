"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  deleteAccountSchema,
  type DeleteAccountInput,
} from "@/lib/auth/validations"

/**
 * Deleting is confirmed in a dialog. Someone with a password types it again;
 * someone who signs in with Google has none, and the server then requires a
 * session that was created recently.
 */
export function DeleteAccount({
  withPassword,
}: {
  withPassword: boolean
}) {
  const router = useRouter()
  const form = useForm<DeleteAccountInput>({
    // a Google-only user has nothing to type
    resolver: withPassword
      ? zodResolver(deleteAccountSchema)
      : undefined,
    defaultValues: { password: "" },
  })

  async function onSubmit({
    password,
  }: DeleteAccountInput) {
    const { error } = await authClient.deleteUser(
      withPassword ? { password } : {}
    )
    if (error) {
      form.setError("root", {
        message:
          error.message ??
          "Something went wrong. Try again.",
      })
      return
    }
    toast.success("Your account was deleted.")
    router.push("/")
    // drop cached pages that were rendered for this user
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <Form {...form}>
          <form
            noValidate
            onSubmit={(event) =>
              void form.handleSubmit(onSubmit)(event)
            }
            className="space-y-4"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete your account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Your account and saved details are removed
                for good.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {withPassword && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Enter your password to confirm
                    </FormLabel>
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
            )}

            {form.formState.errors.root && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {form.formState.errors.root.message}
              </p>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Deleting…"
                  : "Delete my account"}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
