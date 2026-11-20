import type { Metadata } from "next"

import { LegalPage } from "@/components/layout/LegalPage"

export const metadata: Metadata = {
  title: "About",
  description:
    "What Clothing Store is: a demonstration shop, not a business.",
}

export default function AboutPage() {
  return (
    <LegalPage title="About" dated={false}>
      <p>
        Clothing Store is a demonstration project: a
        complete online shop built to show how browsing,
        checkout, payment, accounts and an admin area fit
        together.
      </p>

      <h2>No real orders</h2>
      <p>
        No goods are shipped and no card is charged for
        real. The products, people and orders you see are
        sample data.
      </p>
    </LegalPage>
  )
}
