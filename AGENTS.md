# AGENTS.md

Guidance for AI coding agents. This file holds only the rules that are easy to break and not obvious from the code; the rest lives elsewhere, so read there first:

- [CONTRIBUTING.md](CONTRIBUTING.md): workflow, commits, general code conventions (strict TypeScript, `@/` alias, Prettier import order, no `console.log`).
- [README.md](README.md): stack, layout and commands (`package.json` has every script).
- [docs/features.md](docs/features.md): what each feature does. [docs/decisions.md](docs/decisions.md): why, as numbered decisions ("decision N" below). [docs/known-limitations.md](docs/known-limitations.md): known gaps.

Record a design decision in `docs/decisions.md` in the same pull request that makes it. Add a dependency only when the platform and the existing dependencies do not cover the need.

Run lint, format check, typecheck and tests before declaring a change done, and the integration tests whenever the change touches the database. Never run integration and end-to-end tests at the same time: they share the test database.

## Conventions

- Server code logs through `logger` from `@/lib/logger` (called like `console.error`), so every line is JSON.
- **Environment:** read configuration only through `env` from `@/env`, never `process.env`. A new variable goes in the schema and `runtimeEnv` of `src/env.ts`, `.env.example`, and `.env.test` when tests need it (decision 5).
- **Database:** use the shared client from `@/lib/db/client`, never another `PrismaClient`. A schema change is committed with its migration (`pnpm db:migrate`); `src/generated` is never committed.
- **Email:** only through `sendEmail` from `@/lib/email/mailer` with a template from `@/lib/email/templates` (decision 13). Locally it lands in Mailpit at http://localhost:8025.

### Catalog

- Money is whole cents (`priceCents`), shown only through `formatPrice` from `@/lib/catalog/format`. Never store, add or compare prices as floats (decision 20).
- Read products only through `@/lib/catalog/queries`. Stock is per size (`ProductSize.stock`); a product is in stock while any size has stock. A new category or product type needs an entry in `src/lib/catalog/taxonomy.ts` (decision 21).
- A page that reads the database calls `await connection()` from `next/server` before the first query, or Next prerenders it at build time (decision 23).
- Shop filters live in the URL: add one to `shopParsers`, read it with the same parsers on server and client, build links with `shopHref`, and reset `page` when a filter changes (decision 24).
- Product cards have one link each, with the image marked decorative (`alt=""`).

### Cart (decision 25)

- A line holds only `productId`, `size` and `quantity`; `buildCart` is the only place that prices a line. Validate whatever comes back from `localStorage` with zod, and read prices and stock again at checkout.
- Add only through `add(item, quantity, limit)` with the stock as `limit`. Show cart state only after `useHydrated()`.
- `loadCartProducts` is a server action without `requireUser`, on purpose: it returns only what the shop pages already show.

### Addresses (decision 27)

- Read and write only through `@/lib/address/queries`; every function takes the user's id and filters by it, and someone else's address is "not found", never "forbidden". Do not bypass `queries.ts` with raw Prisma: it holds the per-user advisory lock behind the address limit and the one-default rule. Actions call `requireUser` and re-validate with `addressSchema`.
- Country rules are one table in `@/lib/address/countries`; never write them in a component. Store with `normalizeAddress`, print with `addressLines`.

### Orders (decisions 28, 29, 31)

- Place orders only through `placeOrder` in `@/lib/orders/place` (via `placeOrderAction`). The browser sends ids, sizes and quantities and nothing else; never accept a price.
- Stock leaves a size only through the guarded UPDATE (`stock >= quantity`) inside that transaction, and returns only in `cancelOrder`, guarded by the status change. Lock lines in sorted order. Test anything touching stock with concurrent requests.
- An order copies the product name, size, image, unit price and the address; never point it at the saved address or read a price from the product afterwards.
- Totals come from `computeTotals` in `@/lib/orders/pricing`. Status moves are `ORDER_TRANSITIONS` in `@/lib/orders/status`: add a transition there, never an ad-hoc status update.
- Every order query takes the user's id and filters by it. A new payment method is a new `PaymentMethod` value and a branch in checkout.

### Photos (decisions 39-41)

- Uploads use the presigned POST from `createUpload` in `@/lib/storage/uploads`, never a route or action that receives the file. Keys come only from `newPhotoKey`; `isPhotoKey` is the only check on a key from the browser; `inspectUpload` re-checks the object before anything refers to it.
- Attach and detach `ProductImage` rows only inside `createProduct`, `updateProduct` and `deleteProduct`; `removableKeys` keeps any file a placed order still shows.
- Keep `UPLOAD_LIFETIME_MS` shorter than `SWEEP_AFTER_MS`, and make anything that starts to refer to a photo file count as "in use" for `sweepUnusedPhotos`.
- Photos in the product form are a plain form value (`useWatch`), not a field array. Tests create the bucket with `ensureLocalBucket`, never app code.

### Payments (decisions 32-34)

- Money moves only on a signed Stripe event: `POST /api/webhooks/stripe` verifies the signature and calls `handleStripeEvent`. Never treat a redirect, query string or `?paid=1` as proof of payment; the order page shows what the database says.
- `handleStripeEvent` stays idempotent (event id stored with its effects, order row `FOR UPDATE`). A new event type is a new case with tests for a duplicate and for copies arriving together. Nothing that calls Stripe goes in the transaction, except the refund, which marks the event handled only after it succeeds.
- A payment for a cancelled order is refunded; a mismatched amount or currency is an error. Amounts, names and images sent to Stripe come from `OrderItem`, never the product.
- A card order holds its stock; `paymentUrlFor` makes or finds its session. If no payment page opens, call `abandonCardOrder`; whatever cancels a card order also calls `expireSession`.
- Tests never reach Stripe: `STRIPE_API_URL` points at `stripe-mock`. Build orders with `createCardOrder`.

### Admin (decisions 35-38, 42, 43)

- Every page and action under `/admin` calls `requireRole("ADMIN", <path>)` itself (layouts do not re-render between pages); a non-admin gets a 404. Never add a route, action or screen that sets a role: admins are made by `scripts/admin.ts` (`@/lib/admin/roles`).
- Every change calls `recordAudit(tx, ...)` in the same transaction, naming the admin with `actorOf(user)`, with a summary a person can read unaided.
- Change order status only through `advanceOrder`, `cancelAsAdmin` and `retryRefund` in `@/lib/admin/order-actions`, never `Order.status` directly. Refunds go through `refundPayment` after the cancel is saved; a cancelled order whose `paymentStatus` is still `PAID` is a refund owed.
- Change products only through `createProduct`, `updateProduct` and `deleteProduct` in `@/lib/admin/product-changes`. Read prices with `parsePrice` (never `parseFloat`). Never write a size's stock without the compare-and-set on `expectedStock`. A size is known by its label; the form does not rename one.
- Dashboard numbers come from `getDashboard`; a failed query must raise an error, not show zero.
- Admin lists are a `DataTable` with `Pagination`. Read `?sort=&dir=` with `parseSort` and a fixed column list, map columns to fields in the query (never pass visitor text to `orderBy`), add the id as the last tie-breaker, and build heading links with `sortHref`. Escape search text with `escapeLike` from `@/lib/db/like`.
- A demo account (`user.isDemo`) is shared and must stay harmless: every admin action or route that changes something checks `admin.isDemo` right after `requireRole` and returns `DEMO_READ_ONLY`, with a case in `demo-admin.integration.test.ts`. New Better Auth endpoints that change an account go in `DEMO_BLOCKED` in `@/lib/auth/auth`.
- Use `Card`, `Table`, `Badge` and `Button`, with `OrderStatusBadge` and `PaymentStatusBadge`. Admin menus use `SectionNav`. End-to-end specs that add or delete products belong in `e2e/admin-products.spec.ts`, which runs last because the catalog tests count the sample catalog.

### Auth (decisions 14-17, 26)

- Protect every page, route handler and action by calling `requireUser` or `requireRole` from `@/lib/auth/session` inside it; the proxy is only an early redirect. The client session's role is for display, never authorization. `/account` pages call `requireUser` themselves.
- Responses must not reveal whether an email has an account, so never await `sendEmail` in an auth callback.
- Password changes and account deletion go through Better Auth (`changePassword`, `deleteUser`), not Prisma; the email address cannot be changed. Password screens render only when `hasPassword(user.id)` is true.
- Forms use react-hook-form with a zod schema from `@/lib/auth/validations`, `noValidate`, and server errors in a `role="alert"` element.

### Security headers (decision 44)

- Every response carries the nonce-based CSP from `src/proxy.ts`. A new script takes the nonce (`headers().get("x-nonce")`); never add `'unsafe-inline'` for scripts. A new origin the browser must reach goes in `buildCsp`. Load third-party scripts only after consent (`useConsent`).

### UI

- Tailwind utilities and the tokens in `src/app/globals.css`; never raw colors, each must work in light and dark (decision 10). Join classes with `cn()` from `@/lib/utils`. Compose pages in `Container`; interactive elements need an accessible name.
- Add a shadcn primitive only when a feature needs it, and compose instead of editing `src/components/ui/` (decision 9).
- Confirm success with `toast.success` from `sonner`; failures and refusals stay inline as `role="alert"` text.

### Tests (decisions 6, 7, 11, 19)

- `*.test.ts` is a unit test (no database), `*.test.tsx` a jsdom component test with an axe check for new UI, `*.integration.test.ts` uses the real test database and calls `resetDb()` from `@/test/reset-db` in `beforeEach`.
- Create data with `createProduct`, `createUser` and `createSavedAddress` from `@/test/factories`.
- `e2e/*.spec.ts` import `test` and `expect` from `e2e/support/test`, navigate with `open()` from `e2e/support/flows`, and read email with `waitForLink` from `e2e/support/mailpit`.
- `pnpm db:seed` loads only the catalog, which the tests rely on; anything else goes in the demo seed (`prisma/demo.ts`), whose orders follow the real rules (totals from `computeTotals`, cash paid only on delivery, a paid card order confirmed).

## Git

- Conventional Commits, small pull requests, squash merge ([CONTRIBUTING.md](CONTRIBUTING.md)). Never bypass the hooks (`--no-verify`).
- Do not commit environment files other than `.env.example` and `.env.test`, and do not edit `pnpm-lock.yaml` by hand.

## Next.js

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
