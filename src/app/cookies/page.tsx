import type { Metadata } from "next"

import { LegalPage } from "@/components/layout/LegalPage"

export const metadata: Metadata = { title: "Cookie policy" }

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie policy">
      <p>
        The shop sets the cookies it needs to work, and one
        more kind only if you allow it.
      </p>

      <h2>Always on</h2>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Lasts</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>better-auth.session_token</td>
            <td>Keeps you signed in</td>
            <td>Until you sign out, or up to 7 days</td>
          </tr>
          <tr>
            <td>consent</td>
            <td>Remembers your choice below</td>
            <td>1 year</td>
          </tr>
        </tbody>
      </table>
      <p>
        Your cart and your theme choice (light or dark) are
        kept in your browser&apos;s local storage, not in a
        cookie, and are never sent to us.
      </p>

      <h2>Only with your permission</h2>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Lasts</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>_ga, _ga_*</td>
            <td>
              Google Analytics: tells visits apart and
              counts pages viewed. Nothing is loaded from
              Google, and none of these are set, until you
              choose &ldquo;Allow analytics&rdquo;.
            </td>
            <td>Up to 2 years</td>
          </tr>
        </tbody>
      </table>

      <h2>Changing your mind</h2>
      <p>
        Use &ldquo;Cookie settings&rdquo; in the footer at
        any time. Withdrawing your permission removes the
        analytics cookies and stops the analytics code.
      </p>
    </LegalPage>
  )
}
