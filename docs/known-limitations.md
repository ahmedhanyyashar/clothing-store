# Known limitations

What the project does not do, stated as plain facts so nobody has to find them out. Each is a deliberate boundary of a demonstration project, not an oversight.

## Accounts and access

- **Admins sign in with one factor.** There is no two-step sign-in. An admin is made only by an operator command, never from the web, and the audit log records everything an admin does.
- **Demo accounts are shared.** They are limited on the server (no changes to the account, and the demo admin changes nothing), but everyone who uses them sees, and affects, the same data.

## Orders and payments

- **Card payments were tested against Stripe's API mock and signed test events**, not by a live Stripe test-mode payment. The webhook, refund and idempotency paths are covered by tests; the first real payment is the first time Stripe itself is in the loop.
- **Google sign-in has not been exercised against Google** in an automated test. The form and the callback are covered up to the provider's boundary.
- **A card order whose Stripe events never arrive stays pending.** Events normally close an unpaid order after about half an hour; nothing scans for one whose events were lost.
- **Email is sent after the change is saved and is not retried.** A failed send is logged. There is no outbox.
- **One currency and one language.** Prices are in US dollars and the interface is in English.

## Photos

- **Photos have no alternative text of their own.** They use the product's name.
- **Metadata is not stripped.** An uploaded file is stored as it arrived, including any location data in it; shoppers see a resized copy.
- **Signing a photo upload has no rate limit of its own.** Only admins can ask for one.

## Operations

- **Nothing runs the clean-up commands on a schedule.** `pnpm storage:sweep` (unused photo files) and `pnpm db:seed:demo` (restoring the demo) are commands an operator runs.
- **There is one AWS environment**, production, sized small by default. High availability and data protection are settings, off by default so that the stack can be removed with one command.
- **The site uses CloudFront's own address.** A domain of your own needs a certificate in `us-east-1`, which not every account may use.
- **Nothing is known about behaviour under load.** The checkout is tested for races between buyers, not for throughput.
- **Error reporting is the structured log.** There is no alerting service attached to it.

## Admin lists

- **The product list cannot be sorted by stock.** Stock is a sum over sizes, not a column.
