import type { Metadata } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireUser } from "@/lib/auth/session"

import { ProfileForm } from "./profile-form"

export const metadata: Metadata = { title: "Account" }

export default async function AccountPage() {
  const user = await requireUser("/account")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your name appears on your orders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user.email}</dd>
        </dl>
        <ProfileForm name={user.name} />
      </CardContent>
    </Card>
  )
}
