import type { Metadata } from "next"

import { LegalPage } from "@/components/layout/LegalPage"

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What personal data Clothing Store keeps, why, and how to delete it.",
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        Clothing Store is a demonstration project. No goods
        are shipped and no card is ever charged for real,
        but the shop handles personal data the way a real
        one would, and this page describes exactly how.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name, your
          email address, and either a password (stored only
          as a one-way hash) or the fact that you sign in
          with Google.
        </li>
        <li>
          <strong>Your addresses:</strong> up to three
          delivery addresses, with a phone number, that you
          choose to save.
        </li>
        <li>
          <strong>Your orders:</strong> what you bought, the
          prices, the delivery address as it was on the day,
          and how it was paid. For a card payment the card
          details go to Stripe and never reach us.
        </li>
        <li>
          <strong>Your cart:</strong> kept in your own
          browser only, until you check out.
        </li>
        <li>
          <strong>Sign-in records:</strong> a session
          cookie, and the address your requests come from,
          used to limit repeated attempts.
        </li>
      </ul>

      <h2>Why, and on what basis</h2>
      <p>
        We use this data to run your account and to take,
        pay, deliver and look after your orders: that is the
        contract between you and the shop. We keep orders
        for the shop&apos;s records. Visit counting with
        Google Analytics happens only if you allow it, and
        you can change your mind at any time from
        &ldquo;Cookie settings&rdquo; in the footer.
      </p>

      <h2>Who else receives it</h2>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Who</th>
            <th>What for</th>
            <th>What they receive</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Stripe</td>
            <td>Card payments and refunds</td>
            <td>
              Your card details, the order total, your email
            </td>
          </tr>
          <tr>
            <td>Amazon Web Services</td>
            <td>Hosting and storing product photos</td>
            <td>
              Everything the shop stores, on our behalf
            </td>
          </tr>
          <tr>
            <td>An email provider</td>
            <td>Verification, password and order emails</td>
            <td>
              Your name, email address and the message
            </td>
          </tr>
          <tr>
            <td>Google</td>
            <td>
              Signing in with Google; visit counting if you
              allow it
            </td>
            <td>
              Your Google profile on sign-in; page views and
              device details for analytics
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not sell your data or use it for advertising.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          Your account and addresses: until you delete your
          account.
        </li>
        <li>
          Orders: when you delete your account, your
          finished orders stay for the shop&apos;s records,
          with your name, phone number and address removed.
        </li>
        <li>
          Sessions: until they expire or you sign out.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can see and correct your name and addresses in
        your account, and delete your account and personal
        data under Settings. An account with an order that
        has not yet been delivered or cancelled can be
        deleted once that order is done. You can also ask us
        for a copy of your data, object to how it is used,
        or complain to your data protection authority. Write
        to{" "}
        <a
          href="mailto:privacy@clothing-store.example"
          className="underline"
        >
          privacy@clothing-store.example
        </a>
        .
      </p>

      <h2>Cookies</h2>
      <p>
        See the{" "}
        <a href="/cookies" className="underline">
          cookie policy
        </a>{" "}
        for what is set and why.
      </p>
    </LegalPage>
  )
}
