# AGENTS.md

Guidance for AI coding agents working in this repository. Human contributors should read [CONTRIBUTING.md](CONTRIBUTING.md), which this file builds on.

## Project

A clothing store built with Next.js (App Router), React and TypeScript, backed by PostgreSQL through Prisma, styled with Tailwind CSS 4 and shadcn/ui, with Better Auth for authentication and SMTP for email. Only the foundation exists so far: routes live in `src/app/` (health and readiness handlers, error and not-found pages), the page shell is in `src/components/layout/`, the shadcn primitives are in `src/components/ui/`, the validated environment is in `src/env.ts`, the database client is in `src/lib/db/client.ts`, and the Prisma schema holds the authentication and catalog models, the product queries are in `src/lib/catalog/`, the cart is in `src/lib/cart/` and `src/components/cart/`, saved addresses are in `src/lib/address/` and `src/components/address/`, orders are in `src/lib/orders/`, `src/components/checkout/` and `src/components/orders/`, and payments are in `src/lib/payments/` and `src/app/api/webhooks/stripe/`. Security headers are set in `next.config.ts`.

## Commands

| Command                 | Use                                                |
| ----------------------- | -------------------------------------------------- |
| `pnpm dev`              | Development server on port 3000                    |
| `pnpm lint`             | ESLint                                             |
| `pnpm format:check`     | Prettier check (`pnpm format` to fix)              |
| `pnpm typecheck`        | Route type generation and `tsc --noEmit`           |
| `pnpm test`             | Unit and component tests, single run               |
| `pnpm test:integration` | Integration tests (databases must be up)           |
| `pnpm test:e2e`         | Browser tests (databases and mail catcher up)      |
| `pnpm compose`          | Start the development and test databases           |
| `pnpm db:generate`      | Generate the Prisma client after a schema change   |
| `pnpm db:migrate`       | Create and apply a migration after a schema change |
| `pnpm db:deploy`        | Apply existing migrations                          |
| `pnpm db:seed`          | Replace the dev catalog with sample products       |
| `pnpm build`            | Production build                                   |

Run lint, format check, typecheck and tests before declaring a change done. Run the integration tests whenever the change touches the database.

## Conventions

- Strict TypeScript. No `any`, no unused variables (prefix with `_` when intentional).
- Use the `@/` alias for imports from `src/`. Import order is applied by Prettier, so run `pnpm format` instead of ordering by hand.
- No `console.log`.
- Record a design decision in `docs/decisions.md` in the same pull request that makes it.
- Add a dependency only when the platform and the existing dependencies do not cover the need.

### Environment

- Read configuration only through `env` from `@/env`, never `process.env`.
- Add a new variable in the same change in three places: the schema and `runtimeEnv` in `src/env.ts`, `.env.example`, and `.env.test` when tests need it.

### Database

- Use the shared client from `@/lib/db/client`. Do not create another `PrismaClient`.
- A schema change needs a migration (`pnpm db:migrate`), committed with the change. The generated client in `src/generated` is never committed.

### Email

- Send email only through `sendEmail` from `@/lib/email/mailer`, with a template from `@/lib/email/templates`. Locally every message lands in Mailpit at http://localhost:8025.

### Catalog

- Money is whole cents everywhere (`priceCents`). Turn it into text only with `formatPrice` from `@/lib/catalog/format`. Never store, add or compare prices as floating-point numbers.
- Read products only through `@/lib/catalog/queries`. The shop's URL is read with the shared parsers in `@/lib/catalog/search-params`, so a link and the filter controls always agree.
- Stock is per size (`ProductSize.stock`), not per product. A product is in stock while any size has stock.
- A new category or product type needs an entry in `src/lib/catalog/taxonomy.ts`; the compiler rejects an enum value without one.
- Create products in tests with `createProduct` from `@/test/factories`.
- A page that reads the database must render per request: call `await connection()` from `next/server` before the first query. Otherwise Next prerenders it at build time and freezes whatever the database held then.
- Shop filters live in the URL. Add a filter to `shopParsers` and read it with the same parsers on the server and the client. Build links with `shopHref` so they keep the current view, and reset `page` whenever a filter changes.
- Product cards have one link each, with the image marked decorative (`alt=""`).

### Cart

- The cart is client state (`useCartStore` in `@/lib/cart/store`, persisted in `localStorage`). A line holds only `productId`, `size` and `quantity`. Never store a name, an image or a price in it: they are read from the server with `useCart` and priced by `buildCart`, which is the only place that decides what a line is worth.
- Whatever comes back from `localStorage` is untrusted and validated with zod. The cart is not an authority on prices or stock: checkout must read both from the database again.
- Add to a line only through `add(item, quantity, limit)`, passing the stock as `limit`. Show cart state only after `useHydrated()`, because the server cannot know what the browser holds.
- `CartSession` empties the cart when the signed-in person changes. A visitor who signs in keeps theirs.
- `loadCartProducts` is a server action without `requireUser`, on purpose: it returns only what the shop pages already show.

### Addresses

- A user's saved addresses are read and written only through `@/lib/address/queries`, and every function takes the user's id and filters by it. Someone else's address is "not found", never "forbidden". Server actions in `@/lib/address/actions` call `requireUser` and validate again with `addressSchema`.
- The countries we deliver to, and their postal code, region and phone rules, are one table in `@/lib/address/countries`. A new country is a new entry there; the compiler rejects a code without one. Do not write country rules in a component.
- Store addresses with `normalizeAddress` (phone in international form, postal code upper-cased, empty optionals as null). Print them with `addressLines`.
- A user has at most one default address. The database enforces it with a partial unique index, and the queries take a per-user advisory lock so two requests cannot break the address limit or the "one default" rule. Do not bypass `queries.ts` with raw Prisma calls.
- An order must copy the address it ships to, not point at the saved row, which the user can edit or delete.

### Orders

- Place orders only through `placeOrder` in `@/lib/orders/place`, called from the `placeOrderAction` server action. It takes ids, sizes and quantities from the browser and nothing else: names, prices and stock are read inside its transaction. Never accept a price from a client.
- Stock leaves a size only through the guarded update (`stock >= quantity` in the UPDATE itself) inside that transaction, and goes back only in `cancelOrder`, guarded by the status change. A check followed by a write is not safe: two buyers pass the check together.
- Lock lines in a fixed order (the lines are sorted) so two orders over the same sizes cannot deadlock.
- An order copies the product name, size, image and unit price, and the address, at purchase. Do not point an order at a saved address or read a price from the product afterwards.
- Totals come from `computeTotals` in `@/lib/orders/pricing`; the cart, the checkout and the order all use it. Status rules are `ORDER_TRANSITIONS` in `@/lib/orders/status`: add a transition there, never an ad-hoc status update.
- Every order query takes the user's id and filters by it; someone else's order is "not found". A checkout attempt has one idempotency key (a uuid made in the browser); the same key returns the same order.
- A new payment method is a new `PaymentMethod` value and a new branch in checkout; the order tables do not change.
- Create users and saved addresses in tests with `createUser` and `createSavedAddress` from `@/test/factories`. Test anything that touches stock with concurrent requests, not only sequential ones.

### Payments

- Money moves only on a signed Stripe event. `POST /api/webhooks/stripe` verifies the signature over the raw body and passes the event to `handleStripeEvent`. Never treat a redirect, a query string or anything from the browser as proof of payment.
- `handleStripeEvent` must stay idempotent: the event id is stored with its effects in one transaction, and the order row is locked (`FOR UPDATE`) while it is read and changed. A new event type is a new case there, with tests for a duplicate and for copies arriving together. Nothing that calls Stripe goes inside the transaction; the refund is the one exception and marks the event handled only after it succeeded.
- A payment for an order that is cancelled is refunded, never ignored. An amount or currency that does not match the order is an error, not a payment.
- Tests never reach Stripe. `STRIPE_API_URL` points the client at the `stripe-mock` service (compose and CI), and webhooks are tested by calling `handleStripeEvent` or by posting events signed with the test secret. Build orders in tests with `createCardOrder` from `@/test/factories`.
- Amounts, names and images sent to Stripe come from the order's own copies (`OrderItem`), never from the product.
- A card order is made first and holds its stock; `paymentUrlFor` then makes or finds its Stripe session (one idempotency key per order). If no payment page can be opened, release the order with `abandonCardOrder`. Whatever cancels a card order also closes its session with `expireSession`.
- The order page shows what the database says. After Stripe it waits for the webhook (`ConfirmingPayment`); it must never read `?paid=1` as "paid".

### Auth

- Protect every page, route handler and action by calling `requireUser` or `requireRole` from `@/lib/auth/session` inside it. The proxy is only an early redirect and is never the access check.
- The role on the client session is for display. Never authorize from it in the browser.
- Responses must not reveal whether an email address has an account.
- Do not await `sendEmail` inside an auth callback: a slow mail server would make the response time reveal whether an address is registered.
- A page under `/account` calls `requireUser` itself; the account layout does not, because a layout is not re-rendered when moving between its pages. Password screens render only when `hasPassword(user.id)` is true: Google-only users have none.
- Password changes and account deletion go through Better Auth (`changePassword`, `deleteUser`), never directly through Prisma. The email address cannot be changed.
- Forms use react-hook-form with a zod schema from `@/lib/auth/validations`, set `noValidate`, and show server errors in a `role="alert"` element.

### UI

- Style with Tailwind utilities and the tokens from `src/app/globals.css` (`bg-background`, `text-muted-foreground`, and so on). Never use raw colors; every color must work in light and dark mode.
- Add a primitive with the shadcn CLI only when a feature needs it, so `src/components/ui/` holds nothing unused. Do not edit it for feature styling; compose it instead.
- Join class names with `cn()` from `@/lib/utils`. Prettier sorts Tailwind classes.
- Compose pages inside `Container`. Interactive elements need an accessible name.

### Tests

- Tests sit next to the code. `*.test.ts` is a unit test: fast, isolated, no database. `*.test.tsx` is a component test: it runs in jsdom and should include an axe accessibility check for new UI. `*.integration.test.ts` talks to the real test database.
- `e2e/*.spec.ts` are Playwright tests against a production build on port 3100. Import `test` and `expect` from `e2e/support/test`: its fixtures give every test a new user and its own client address, so tests share no state and never trip the rate limiter. Navigate with `open()` from `e2e/support/flows`, which waits for hydration; typing into a form earlier is lost. Read emails through `waitForLink` from `e2e/support/mailpit`. The global setup migrates the test database and loads the sample catalog, which the catalog tests rely on.
- Do not run integration and end-to-end tests at the same time: they share the test database, and the integration helper empties it.
- Integration tests that write data call `resetDb()` from `@/test/reset-db` in `beforeEach`.

## Git

- Conventional Commits, small pull requests, squash merge. Details are in [CONTRIBUTING.md](CONTRIBUTING.md).
- Never bypass the hooks (`--no-verify`).
- Do not commit environment files other than `.env.example` and `.env.test`, and do not edit `pnpm-lock.yaml` by hand.

## Next.js

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
