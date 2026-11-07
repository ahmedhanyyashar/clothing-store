import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AddressForm } from "@/components/address/AddressForm"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAddress } from "@/lib/address/queries"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Edit address" }

export default async function EditAddressPage({
  params,
}: {
  params: Promise<{ addressId: string }>
}) {
  const { addressId } = await params
  const user = await requireUser(
    `/account/addresses/${addressId}`
  )
  // someone else's address is indistinguishable from one that does not exist
  const address = await getAddress(user.id, addressId)
  if (!address) notFound()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit address</CardTitle>
      </CardHeader>
      <CardContent>
        <AddressForm address={address} />
      </CardContent>
    </Card>
  )
}
