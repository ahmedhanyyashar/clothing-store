import type { Metadata } from "next"

import { LegalPage } from "@/components/layout/LegalPage"

export const metadata: Metadata = { title: "Terms of sale" }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of sale">
      <p>
        Clothing Store is a demonstration project. These
        terms describe how an order works in the shop; no
        goods are actually shipped and no card is charged
        for real.
      </p>

      <h2>Prices and shipping</h2>
      <p>
        Prices are in US dollars and include any tax.
        Shipping is a flat $5.00, and free on orders of
        $75.00 or more. What you see at checkout is what you
        pay.
      </p>

      <h2>Ordering and payment</h2>
      <p>
        An order is accepted when it is placed and its items
        are reserved for you. You can pay by card, through
        Stripe&apos;s own payment page, or in cash on
        delivery. A card order that is not paid within about
        half an hour is cancelled and its items go back on
        sale.
      </p>

      <h2>Cancelling and refunds</h2>
      <p>
        You can cancel an order from your account until it
        has shipped. A cancelled order that was paid by card
        is refunded in full to the same card. Cash on
        delivery orders are paid on arrival, so there is
        nothing to refund.
      </p>

      <h2>Delivery</h2>
      <p>
        We deliver to the countries offered in the address
        form. You are told by email when your order ships
        and when it is delivered.
      </p>

      <h2>Your data</h2>
      <p>
        How we use your personal data is explained in the{" "}
        <a href="/privacy" className="underline">
          privacy policy
        </a>
        .
      </p>
    </LegalPage>
  )
}
