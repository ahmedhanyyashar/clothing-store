import type { Metadata } from "next"

import { Container } from "@/components/layout/Container"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Account" }

export default async function AccountPage() {
  const user = await requireUser("/account")

  return (
    <Container className="py-16">
      <h1 className="text-4xl font-semibold tracking-tight">
        Account
      </h1>
      <dl className="mt-8 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="text-muted-foreground">Name</dt>
        <dd>{user.name}</dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd>{user.email}</dd>
      </dl>
    </Container>
  )
}
