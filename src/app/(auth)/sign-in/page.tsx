import type { Metadata } from "next"
import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSafeRedirect } from "@/lib/utils"

import { SignInForm } from "./form"

export const metadata: Metadata = { title: "Sign in" }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirect?: string
    error?: string
  }>
}) {
  const { redirect, error } = await searchParams

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use your email and password, or continue with
          Google.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm
          redirectTo={getSafeRedirect(redirect)}
          notice={
            error
              ? "That verification link is invalid or has expired. Sign in to get a new one."
              : undefined
          }
        />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/sign-up" className="underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
