import type { Metadata } from "next"
import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ResetPasswordForm } from "./form"

export const metadata: Metadata = {
  title: "Reset password",
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams
  const usable = token && !error

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          {usable
            ? "Pick a password you do not use anywhere else."
            : "This reset link is invalid or has expired."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {usable ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm">
            <Link
              href="/forgot-password"
              className="underline"
            >
              Request a new link
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
