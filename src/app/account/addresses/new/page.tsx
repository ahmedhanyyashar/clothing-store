import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AddressForm } from "@/components/address/AddressForm"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listAddresses } from "@/lib/address/queries"
import { MAX_ADDRESSES } from "@/lib/address/validations"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Add address" }

export default async function NewAddressPage() {
  const user = await requireUser("/account/addresses/new")
  const existing = await listAddresses(user.id)
  // the form would be refused on save, so do not offer it
  if (existing.length >= MAX_ADDRESSES)
    redirect("/account/addresses")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add an address</CardTitle>
      </CardHeader>
      <CardContent>
        <AddressForm isFirst={existing.length === 0} />
      </CardContent>
    </Card>
  )
}
