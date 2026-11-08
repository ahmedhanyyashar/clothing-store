import type { Metadata } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  hasPassword,
  requireUser,
} from "@/lib/auth/session"

import { ChangePasswordForm } from "./change-password-form"
import { DeleteAccount } from "./delete-account"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const user = await requireUser("/account/settings")
  const withPassword = await hasPassword(user.id)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            {withPassword
              ? "Use a password you do not use anywhere else."
              : "You sign in with Google, so there is no password to change."}
          </CardDescription>
        </CardHeader>
        {withPassword && (
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            This permanently removes your account and
            personal data. It cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccount withPassword={withPassword} />
        </CardContent>
      </Card>
    </>
  )
}
