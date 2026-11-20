import type { Metadata } from "next"
import Link from "next/link"

import { LegalPage } from "@/components/layout/LegalPage"

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Clothing Store.",
}

export default function ContactPage() {
  return (
    <LegalPage title="Contact" dated={false}>
      <p>
        Clothing Store is a demonstration project, so nobody
        reads this mailbox. The address below is a
        placeholder.
      </p>

      <h2>Email</h2>
      <p>
        <a
          href="mailto:support@example.com"
          className="underline"
        >
          support@example.com
        </a>
      </p>

      <h2>Your orders</h2>
      <p>
        Track or cancel an order from{" "}
        <Link href="/account/orders" className="underline">
          your orders
        </Link>
        .
      </p>
    </LegalPage>
  )
}
