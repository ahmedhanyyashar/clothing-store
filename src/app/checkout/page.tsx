import type { Metadata } from "next"

import { CheckoutView } from "@/components/checkout/CheckoutView"
import { Container } from "@/components/layout/Container"
import { listAddresses } from "@/lib/address/queries"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
}

export default async function CheckoutPage() {
  const user = await requireUser("/checkout")
  const addresses = await listAddresses(user.id)

  return (
    <Container className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Checkout
      </h1>
      <CheckoutView addresses={addresses} />
    </Container>
  )
}
