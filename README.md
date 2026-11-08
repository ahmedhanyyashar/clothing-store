# Clothing Store

An online clothing store, built end to end with Next.js and TypeScript. The repository is assembled one reviewed pull request at a time, and each change ships with its tests and documentation.

## Status

Foundation: project scaffold, quality gates, CI, a PostgreSQL database wired in with Prisma, the design system with the page shell, and transactional email, authentication, the product catalog with its shop pages, the shopping cart, an account area, and checkout with orders. Features are added in later pull requests, and this README grows with them.

## Stack

| Area            | Choice                                         |
| --------------- | ---------------------------------------------- |
| Framework       | Next.js (App Router), React, TypeScript strict |
| Styling         | Tailwind CSS 4, shadcn/ui (Radix), Lucide      |
| Authentication  | Better Auth: email and password, Google        |
| Email           | Nodemailer over SMTP, Mailpit locally          |
| Payments        | Stripe Checkout and signed webhooks            |
| Database        | PostgreSQL 16, Prisma 7                        |
| Configuration   | Environment validated at startup (zod)         |
| Package manager | pnpm                                           |
| Linting         | ESLint (Next.js config) and Prettier           |
| Tests           | Vitest, Testing Library, axe                   |
| Git workflow    | Husky, lint-staged, commitlint                 |
| CI              | GitHub Actions                                 |

## Getting started

Requires [Node.js](https://nodejs.org) 24, [pnpm](https://pnpm.io) 12 (`corepack enable` picks up the pinned version) and [Docker](https://www.docker.com).

```bash
pnpm install
cp .env.example .env
pnpm compose        # starts the databases and the local mail catcher
pnpm db:deploy      # applies the migrations to the development database
pnpm db:seed        # fills it with sample products
pnpm dev
```

The app runs on http://localhost:3000. Edit `.env` first: set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) the Google credentials and, for card payments, the Stripe test keys (see the comments in `.env.example` and Payments below). Every email the app sends, such as verification and password-reset links, lands in Mailpit at http://localhost:8025.

| Endpoint          | Meaning                                                        |
| ----------------- | -------------------------------------------------------------- |
| `GET /api/health` | Liveness: the process is running                               |
| `GET /api/ready`  | Readiness: the database answers (`503` with no details if not) |

## Scripts

| Script                               | Purpose                                      |
| ------------------------------------ | -------------------------------------------- |
| `pnpm dev`                           | Start the development server                 |
| `pnpm build` / `pnpm start`          | Production build, and serve it               |
| `pnpm lint` / `pnpm lint:fix`        | Check, or fix, lint errors                   |
| `pnpm format` / `pnpm format:check`  | Write, or check, formatting                  |
| `pnpm typecheck`                     | Generate route types and run `tsc`           |
| `pnpm test` / `pnpm test:watch`      | Unit and component tests, once or watching   |
| `pnpm test:integration`              | Integration tests (needs `pnpm compose`)     |
| `pnpm test:e2e`                      | End-to-end tests in a browser (see Testing)  |
| `pnpm compose` / `pnpm compose:down` | Start or stop the local databases            |
| `pnpm db:generate`                   | Generate the Prisma client                   |
| `pnpm db:migrate` / `pnpm db:deploy` | Create and apply, or only apply, migrations  |
| `pnpm db:seed`                       | Replace the dev catalog with sample products |
| `pnpm db:studio`                     | Browse the database                          |

## Project structure

```text
src/app/          routes, layouts, error and not-found pages, route handlers
src/components/   ui/ holds shadcn primitives, layout/ the page shell, catalog/ the shop, cart/ the cart
src/env.ts        the validated environment, the only place variables are read
src/lib/db/       the Prisma client
src/lib/catalog/  product queries, shop URL parsing, price formatting
src/lib/cart/     the cart store, its server lookup and the pure totals
src/lib/address/  saved addresses: the country rules, validation and the queries
src/lib/orders/   placing and reading orders, shipping and statuses
src/lib/payments/ the Stripe client, the webhook and the card payment page
src/lib/auth/     Better Auth setup, server-side guards and form schemas
src/lib/email/    SMTP mailer and email templates
src/proxy.ts      redirects for signed-out and signed-in visitors
src/test/         test helpers and global setup
prisma/           schema and migrations
docker/           local PostgreSQL (development and test databases) the mail catcher and a stand-in for the Stripe API
e2e/              end-to-end tests (Playwright)
docs/             design decisions
public/products/  sample product photos, with their credits
.github/          CI workflow, shared setup action, Dependabot, PR template
.husky/           Git hooks: lint-staged on commit, commitlint on message
```

## Shop

- **Home** features the best sellers and the latest arrivals.
- **Shop** (`/shop`) filters by category and type (several of each at once), searches by name, sorts by newest or price, and shows 12 products a page. Everything is in the URL, for example `/shop?category=men,women&type=jeans&page=2`, so any view can be shared.
- **Product pages** (`/products/<id>`) show the photos, price, sizes with their availability, and colors.
- These pages render per request, so stock is always current and the build needs no database.

## Cart

- A product page has a size picker, a quantity and an add button. Sold-out sizes cannot be chosen, and the quantity never goes past the stock of the chosen size.
- The header's cart button shows the item count and opens the cart in a drawer. `/cart` is the full page, with quantity changes, removal and the subtotal.
- The cart lives in the browser (`localStorage`) and holds only product ids, sizes and quantities. Names, images, prices and stock are read from the server whenever the cart is shown, so a price change shows up at once. A line whose size sold out, or whose product was removed, is flagged and left out of the total.
- A visitor who signs in keeps the cart they filled. Signing out, or a different person signing in, empties it.

## Authentication

- **Sign-up** needs a verified email address: the account cannot sign in until the emailed link is used. Google sign-in is also available.
- **Passwords** must be at least 12 characters. A reset link signs the user out everywhere.
- **Responses never reveal** whether an email address has an account.
- **Access control** is checked on the server with `requireUser` and `requireRole` from `src/lib/auth/session.ts`. The proxy only redirects early.
- **Roles** are `USER` and `ADMIN`. A role cannot be set from a request.

## Account

- `/account` shows the signed-in user's email and changes their name.
- `/account/security` changes the password: it needs the current one, can sign out the other devices, and emails the owner a notice with a reset link in case it was not them. Someone who only uses Google has no password, so that card says so.
- `/account/addresses` keeps up to 3 saved delivery addresses, one of them the default (the first is, automatically). Each has a label, recipient, phone, street, city, region, postal code, country and delivery notes. The form follows the country: a list of states or provinces where there is one, a postal code checked against that country's format (with an example), and a phone number checked for that country and stored in international form.
- Deleting the account needs the password again (or a recently created session for Google-only users) and removes the user, their sessions and linked accounts.
- The email address is the account's identity and cannot be changed (see decision 26).
- Both the password change and the deletion are rate limited to 5 attempts a minute.

## Checkout and orders

- **Checkout** (`/checkout`) is for signed-in users: a visitor is sent to sign in and the cart waits for them. They review the items, choose a saved address (or add one and come straight back), and place the order. Payment is cash on delivery.
- **Totals:** shipping is a flat $5.00, free from $75.00, and prices include tax, so there is no tax line. Both numbers live in `src/lib/orders/pricing.ts`.
- **Placing an order** reads prices and stock from the database again; the cart in the browser is only a request. Stock is taken with a guarded update inside one transaction, so two buyers can never both get the last item, and an order that cannot be filled changes nothing. A line that cannot be bought is reported by name, with how many are left.
- **An order is a copy.** It keeps the name, size, image and price of each item and the delivery address as they were, so editing a product or an address later never changes it. Order numbers are random and readable (for example `CS-7K2M9QXD`).
- **Double clicks and retries** are harmless: each checkout screen has one key, and the same key returns the same order.
- After placing an order the shopper lands on its page, `/account/orders/<number>`, which only its owner can open.
- `/account/orders` lists the user's orders. A pending order can be cancelled, which puts its stock back. Moving an order to confirmed, shipped or delivered takes a person with admin rights, which is also why cancelling is limited to pending orders. A confirmation email is sent when the order is placed.
- An account with an order that is still pending, confirmed or shipped cannot be deleted. Otherwise the orders stay, with the customer's name, phone and address replaced (see decision 31).

## Payments

- **The webhook** (`POST /api/webhooks/stripe`) is the only thing that marks an order paid. It checks Stripe's signature first, applies each event once however often Stripe sends it, and refuses a payment whose amount does not match the order. A payment that arrives after the order was cancelled is refunded automatically.
- **Trying it by hand:** put a Stripe test secret key in `.env`, run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (the Stripe CLI) and copy the `whsec_` secret it prints into `STRIPE_WEBHOOK_SECRET`. Pay with the test card 4242 4242 4242 4242, any future date and any CVC.
- **Tests** never reach Stripe: `pnpm compose` starts `stripe-mock`, a server generated from Stripe's own API description, and the webhook is tested with events signed by the test secret.

## Testing

Unit tests (`*.test.ts`) need nothing running. Component tests (`*.test.tsx`) render React in a simulated browser and include an accessibility check with axe. Integration tests (`*.integration.test.ts`) use the real test database from `pnpm compose`, run one file at a time, and have their migrations applied automatically before the run. End-to-end tests (`e2e/*.spec.ts`) drive a real browser through sign-up, email verification, sign-in, password reset and browsing the sample catalog against a production build, reading the emails from Mailpit. They need `pnpm compose` running and, the first time, `pnpm exec playwright install chromium`. They use the test database, so do not run them at the same time as the integration tests.

## Quality gates

Locally, a pre-commit hook lints and formats staged files, and a commit-msg hook enforces [Conventional Commits](https://www.conventionalcommits.org). CI runs lint, format, typecheck, unit, component, integration and end-to-end tests and a build on every pull request, and checks every commit message in it.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, and [docs/decisions.md](docs/decisions.md) for the reasoning behind the main choices.
