import type { Metadata } from "next"

import { CartView } from "@/components/cart/CartView"
import { Container } from "@/components/layout/Container"

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false },
}

export default function CartPage() {
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Your cart
      </h1>
      <CartView />
    </Container>
  )
}
