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

import { SignUpForm } from "./form"

export const metadata: Metadata = {
  title: "Create account",
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect } = await searchParams

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          We will email you a link to confirm your address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm
          redirectTo={getSafeRedirect(redirect)}
        />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
