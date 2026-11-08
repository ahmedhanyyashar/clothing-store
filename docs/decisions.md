# Design decisions

Short records of the choices that shaped the code: what was chosen, why, and what it costs. Newest decisions go at the bottom.

## 1. One pull request, one squashed commit, Conventional Commits

**Decision.** Work lands through small pull requests merged with squash, so `main` is linear and each pull request is one commit. Commit messages and pull request titles follow Conventional Commits, enforced by commitlint locally and in CI.

**Why.** A linear history reads as a changelog and makes any change easy to revert. A fixed message format keeps the history searchable and lets release notes be generated later.

**Cost.** Commits inside a pull request are not kept on `main`, so the pull request description has to carry the reasoning.

## 2. TypeScript 6, ESLint 9 and Prisma 7, not the newest majors

**Decision.** Dependencies track the latest releases, except TypeScript, held at 6.x, ESLint, held at 9.x, and Prisma, held at 7.x.

**Why.** `typescript-eslint` refuses to run on TypeScript 7, the plugins bundled in `eslint-config-next` declare no support for ESLint 10, and the newest Prisma CLI is a release candidate that does not match the stable client. Linting is a required check, so each stays on the newest version the toolchain supports.

**Cost.** ESLint 9 is marked deprecated, so installs print a warning. These pins are revisited once the plugins catch up.

## 3. Security headers now, Content-Security-Policy later

**Decision.** `next.config.ts` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and `Strict-Transport-Security` on every route. A Content-Security-Policy is not set yet.

**Why.** The first group is safe independent of what the app loads. A useful policy has to name the scripts, images and connections the app actually uses, and none of those exist yet. A policy written now would either be too loose to matter or would break features later.

**Cost.** Until the policy lands, injected scripts are not constrained by the browser. It is added in the slice that introduces the first third-party origin.

## 4. The health check is liveness only

**Decision.** `GET /api/health` returns `{ "status": "ok" }` without checking any dependency.

**Why.** It answers one question: is this process running? If it also failed on an unavailable dependency, an outage elsewhere would get healthy instances killed and replaced.

**Cost.** It does not report whether the app can serve real requests. A readiness check, if needed, is a separate endpoint.

## 5. The environment is validated at startup and declares only what is used

**Decision.** `src/env.ts` validates the environment with zod when the app boots, and it is the only place variables are read. It lists a variable only once code uses it, and each feature adds its own variables in the pull request that introduces it.

**Why.** A missing or malformed value fails immediately with a readable message, instead of appearing later as a runtime error. Declaring only what exists keeps the schema honest: nothing in it is unused or speculative.

**Cost.** Every new variable needs three edits (the schema, `.env.example`, and `.env.test` if tests use it), and builds and CI must provide the required values.

## 6. Unit and integration tests are separate Vitest projects

**Decision.** `*.test.ts` files are unit tests and `*.integration.test.ts` files are integration tests, run as two Vitest projects. `pnpm test` runs only the unit project. `pnpm test:integration` runs the other, one file at a time, after applying migrations to the test database. CI runs both.

**Why.** A fresh clone has no database, so the default test command must not need one. Integration files share one database, so they cannot run in parallel; unit tests have no such limit.

**Cost.** Two commands to remember, and integration tests need the compose databases running.

## 7. The test database is emptied per file by truncating every table

**Decision.** Integration tests that write data call `resetDb()`, which truncates every table found in the Postgres catalog and restarts identity counters. It refuses to run unless the database name ends in `_test`.

**Why.** Reading the table list from Postgres means the helper never changes when models are added, and the name check makes it impossible to wipe the development database through a wrong URL. Truncation, unlike wrapping each test in a rolled-back transaction, works with code that opens its own transactions, which order creation will.

**Cost.** Slower than rollback for large suites, and tests in one file share state unless they reset it themselves.

## 8. Readiness is a separate endpoint from liveness

**Decision.** `GET /api/ready` runs `SELECT 1` and returns `503` with no error details when the database does not answer. `GET /api/health` stays liveness only.

**Why.** A database outage should take an instance out of rotation without getting it killed and replaced, which only works if the two questions are asked separately.

**Cost.** Two endpoints to keep in sync with what the platform probes.

## 9. UI primitives are added only when a feature needs them

**Decision.** `src/components/ui/` holds only the shadcn primitives that something uses. Each feature adds its own in the pull request that introduces it. The design tokens are the only part installed up front.

**Why.** An unused component is code nobody has tested in context, and reviewing it without its consumer says little. Adding it with the feature shows exactly which components the feature needs.

**Cost.** Several pull requests touch `src/components/ui/`, instead of one up-front install.

## 10. Light and dark themes follow the system and never flash

**Decision.** `next-themes` toggles a `dark` class on `<html>`, defaulting to the system setting. All colors are CSS variables with a value per theme, and the theme toggle renders both icons and lets CSS choose.

**Why.** The theme class is set before hydration, so a returning visitor never sees the wrong theme first, and the toggle renders identically on the server and the client, so there is no hydration mismatch.

**Cost.** Every new color needs a light and a dark value, and components must use the tokens instead of raw colors.

## 11. Component tests run in jsdom with an accessibility check

**Decision.** `*.test.tsx` files form a third Vitest project that renders React with Testing Library in jsdom and checks new UI with axe. It runs as part of `pnpm test`, and jsdom is used only here.

**Why.** Interactions and accessibility regressions are cheap to catch at this level, and keeping jsdom out of the unit project keeps server code tested in a real Node environment.

**Cost.** jsdom lacks some browser APIs (the setup stubs `matchMedia`), and axe covers markup rules, not visual contrast, so it does not replace a manual check.

## 12. Import order is owned by Prettier

**Decision.** Prettier's import-sorting plugin orders imports, and ESLint's `import/order` rule is off.

**Why.** Two tools sorting the same lines disagree on edge cases, such as `next-themes` against `next/font`, and every commit would end up fighting itself.

**Cost.** Import order is applied by formatting, not reported by lint.

## 13. Email is sent over SMTP

**Decision.** `sendEmail` delivers through an SMTP connection URL: Mailpit locally, and whichever provider is chosen in production. Templates are plain typed functions that return a subject, HTML and text.

**Why.** SMTP is the one protocol every provider accepts, so changing provider is a configuration change and not a code change. Plain functions need no templating dependency, and escaping user-supplied text is done in one place.

**Cost.** SMTP does not report bounces or complaints. If the product needs them, that is added for the chosen provider.

## 14. A verified email address is required before sign-in

**Decision.** Email and password accounts cannot sign in until the emailed verification link has been used. Sign-up and the password-reset request answer the same way whether or not the address is already registered, and auth callbacks start the email send without waiting for it.

**Why.** An unverified address may belong to someone else, and an unauthenticated endpoint that confirms which addresses have accounts helps attackers target them. Waiting for the mail server would make the response time give the same information away.

**Cost.** Sign-up needs working email, a user who mistyped their address has to sign up again, and a failed delivery is only logged.

## 15. Passwords are checked by length, and auth rate limits live in the database

**Decision.** The minimum is 12 characters with no composition rules. Rate limits for the auth endpoints are stored in the database.

**Why.** Length is what makes passwords hard to guess, and composition rules push people to predictable patterns. Database-backed limits hold across server instances, where in-memory ones would reset per instance.

**Cost.** A longer minimum than many sites ask for, and an extra table written on auth requests.

## 16. A password reset ends every session, and sign-in checks only that a password was entered

**Decision.** Resetting a password revokes all of the user's sessions. The sign-in form checks that a password was typed, not its length; the length rule applies where passwords are chosen.

**Why.** Revoking sessions removes anyone who held the old password. A rule that only applies when a password is set can never lock out an existing user if it later changes.

**Cost.** A user who resets their password has to sign in again on every device.

## 17. Access is checked on the server; the proxy only redirects early

**Decision.** `requireUser` and `requireRole` run inside every protected page, route and action. `proxy.ts` checks only that a session cookie exists and redirects signed-out visitors before the page renders. A signed-in user without the required role gets a 404.

**Why.** A cookie's presence proves nothing, and a proxy matcher can miss a route, so the check that counts has to sit next to the data. Answering 404 keeps role-only areas from being discovered.

**Cost.** Each protected entry point must remember to call the guard.

## 18. The header reads the session in the browser

**Decision.** `UserMenu` calls `authClient.useSession()` on the client and reserves its space while loading, instead of reading the session in the server-rendered header.

**Why.** Reading cookies on the server would make every page dynamic, including those that could be cached.

**Cost.** A short moment before the sign-in links or the user's name appear.

## 19. End-to-end tests drive a production build with real email and a client of their own

**Decision.** Playwright tests run against `next build` output on a separate port and build directory, with real SMTP into Mailpit, whose HTTP API the tests read links from. Each test gets a new user and its own client address.

**Why.** Only a browser test exercises the whole path: form, HTTP API, email, link, cookie and guard. The production build is what ships. A user per test removes the need for cleanup, and a client address per test keeps the auth rate limiter, which is on, from coupling tests together.

**Cost.** Slower than the other suites, and the browser must wait for hydration before typing, which the `open()` helper does.

## 20. Prices are stored as whole cents

**Decision.** `Product.priceCents` is an integer. `formatPrice` turns it into text and is the only place that does.

**Why.** Integer arithmetic is exact, so sums, totals and refunds never pick up rounding errors. A decimal column would come back from the database as an object that cannot be passed from server to client components without a conversion at every use.

**Cost.** One formatting helper, and every price shown or entered passes through it. A currency other than USD would need a currency column.

## 21. Category and type are enums, sizes are labels, and stock belongs to the size

**Decision.** `Category` and `ProductType` are database enums, each with a slug and label in one typed table that the compiler checks for completeness. A product's sizes are rows with a text label and their own stock count, and colors are display options with no stock.

**Why.** Nothing edits categories at runtime, so enums give a typed, validated list for the filters and the URL. Sizes are text because shoes use numbers where clothes use letters. A customer buys a size, so stock has to be counted per size for the oversell guard at checkout to be correct.

**Cost.** Adding a category or type is a migration and a deploy. Per-size stock means one more table to read for availability.

## 22. The sample catalog ships as small committed fixtures

**Decision.** The seed script and 14 optimized product photos (about 0.8 MB) live in the repository, with a credits file. The database stores only an image URL, so uploaded images can sit beside these later without a schema change.

**Why.** A fresh clone gets a working, good-looking shop offline, and tests and CI never depend on an outside image host.

**Cost.** The photos are permanent in git history, and running the seed replaces every product in the development database.

## 23. Catalog pages render per request

**Decision.** The home page, the shop and the product pages read the database on every request. The home page opts in with `connection()`, and the other two are dynamic by their parameters.

**Why.** Stock must be current, and a page that reads the database at build time freezes whatever it found: an end-to-end test caught the home page prerendered with an empty catalog. It also keeps the build independent of any database, so CI's build job needs none.

**Cost.** A database read per page view. Caching is added when a measurement shows it is needed, not before.

## 24. Filters, search, sort and page live in the URL

**Decision.** The shop's state is the query string (`?category=men,women&type=jeans&q=denim&sort=price-asc&page=2`), read by one set of parsers on the server and the client. Values are readable slugs, several categories or types can be chosen at once, unknown values are dropped, and changing a filter returns to page 1. Controls are native checkboxes and a native select.

**Why.** A view can be shared, bookmarked and reloaded, and the back button works. Sharing the parsers means a link and the controls cannot disagree. Native controls are accessible and work well on phones without extra code.

**Cost.** Every change is a navigation that renders on the server, so a skeleton shows briefly while results load.

## 25. The cart is client state that holds ids, and the server prices it

**Decision.** The cart is a persisted Zustand store in `localStorage`. A line is a product id, a size and a quantity, and nothing else. Whenever the cart is shown, the current name, image, price and stock are read from the server, and a line that cannot be bought (sold out, or gone) is flagged and left out of the total. Whatever is read back from storage is validated, and a cart that does not match is dropped. The cart empties when the signed-in person changes, but a visitor who signs in keeps what they filled.

**Why.** Guests can shop before they have an account, and no schema or migration is needed. Storing only ids means a stored price can never be stale or edited, and the total always comes from the data the store actually charges. A cart that is wiped when a guest signs in would lose the work of exactly the people about to buy.

**Cost.** The cart does not follow the shopper to another device, and showing it needs one request to the server. Moving to a database cart later is an addition: the same store can sync to it on sign-in without changing the screens. Checkout must read prices and stock again, because the browser's cart is only a wish.

## 26. The email address is the account's identity, and security changes notify the owner

**Decision.** A user can change their name and password and delete their account, but not their email address. Changing the password needs the current one, can end the user's other sessions, and sends the owner a notice with a reset link. Deleting needs the password again, or a recently created session for people who only use Google. Both password-checking endpoints have a limit of 5 attempts a minute.

**Why.** The address is what proves who someone is: sign-in, verification and password reset all depend on it. A change-of-email flow is a way to take over an account, so it needs its own careful design and nothing in the shop needs it. A notice by email means a password changed by someone else is noticed. Re-asking for the password before deleting means a left-open browser cannot destroy an account.

**Cost.** Someone who loses access to their address cannot move the account to a new one; they create a new account instead.

## 27. Saved addresses are validated by country rules, with no outside service

**Decision.** A user keeps up to 3 addresses with one default. What counts as a valid address depends on the country, and the rules (the postal code format with an example, the list of states or provinces where one exists, whether a region is required) are one table that the form and the server share. Phone numbers are checked for the chosen country with `libphonenumber-js` and stored in international form. No address autocomplete or map is used.

**Why.** A parcel that cannot be delivered costs more than a form that asks for the right things, and the same rules in the browser and on the server cannot disagree. Autocomplete and maps need a paid provider, a key, and a consent and Content-Security-Policy decision, and the form works well without them. It is written so a provider can fill the same fields later. "At most one default" is enforced by the database, and a per-user lock keeps simultaneous requests from breaking it or the limit of 3.

**Cost.** Adding a country is a code change. Postal code patterns check the format, not that the code exists. Typing a whole address is slower than choosing one from suggestions.

## 28. Stock is taken by the database, inside one transaction

**Decision.** Placing an order reads the current prices and stock inside one transaction and takes the stock with an update that only succeeds while `stock >= quantity`. If any line fails, the transaction rolls back, no stock moves, and the response names each line and how many are left. Lines are locked in a fixed order. The browser sends product ids, sizes and quantities and nothing else: never a price, a name or a total.

**Why.** A check followed by a write lets two buyers pass the check together and oversell. Putting the condition in the UPDATE makes the database the judge, and the database also refuses negative stock as a second line of defence. A fixed locking order prevents deadlocks between orders over the same sizes. Integration tests run many buyers at once to prove the stock never goes below zero and a losing buyer takes nothing.

**Cost.** Every order takes row locks on the sizes it buys, which serializes buyers of the same size for a few milliseconds.

## 29. An order is a copy, its totals are whole cents, and a repeated request is the same order

**Decision.** An order stores the name, size, image and unit price of each item and the delivery address, as they were at purchase. Prices are integer cents. Shipping is a flat $5.00, free from $75.00, in one file, and prices include tax, so there is no tax line. The total is the subtotal plus shipping, and the database checks that. Each checkout attempt has one key, and a repeated request with that key returns the existing order instead of making another. Order numbers are random, readable codes such as `CS-7K2M9QXD`.

**Why.** Products and saved addresses change and disappear; an order is a record of a sale and must not change with them. Cents avoid fractions. A key stops a double click, a retry or a dropped connection from making two orders. Random numbers say nothing about how many orders exist.

**Cost.** Order rows are wider, and shipping is one rule for everywhere. A different rate per country or a tax line means changing the pricing file and the order columns.

## 30. Only signed-in users check out, and the only payment is cash on delivery

**Decision.** Checkout needs an account. A visitor who reaches it is sent to sign in and the cart waits, because the cart is kept through sign-in. The payment method is stored on the order, and cash on delivery is the only value.

**Why.** An account gives saved addresses, order history and cancelling without extra machinery, and avoids tokens for looking up guest orders. Storing the method on the order means another way of paying is a new value and a new branch in checkout, not a change to the order tables.

**Cost.** First-time buyers must register before they can order.

## 31. Orders follow fixed statuses, and deleting an account keeps orders without personal details

**Decision.** An order moves pending, confirmed, shipped, delivered, and can be cancelled before it ships; the allowed moves are one table. A customer can cancel only while it is pending, which restores the stock once, however many times it is asked. An account with an order that is pending, confirmed or shipped cannot be deleted. Otherwise the orders are kept: the customer's name, phone and address are replaced and the link to the user is cleared, while the items, prices and country stay.

**Why.** An order on its way needs its address and someone to receive it. Tax and accounting rules require keeping sales records, while privacy law lets a person ask to be forgotten; anonymising does both. Guarding the cancel with the status change means a double click, or a race with confirmation, cannot put stock back twice.

**Cost.** Someone with a pending order must cancel it or wait before deleting their account. Only a person with admin access can move an order along, so a customer's order stays pending until then.

## 32. A card order exists before it is paid, and holds its stock

**Decision.** A card order is made the same way as a cash order: one transaction reads the prices and takes the stock, and the order starts pending and unpaid. Only then is the shopper sent to pay. The payment is a Stripe Checkout session that closes by itself after about half an hour. Whatever does not end in a payment (the session expires, the shopper cancels, Stripe cannot be reached) cancels the order and puts the stock back. Payment status is kept apart from order status.

**Why.** Creating the order only after payment lets two people pay for the last item, and the loser has to be refunded; it also needs a second, separate stock check at the moment of payment. Taking the stock first means nobody pays for something that has sold out, and it reuses the transaction, the idempotency key and the cancel logic that cash orders already have.

**Cost.** An abandoned payment holds its stock for up to about 31 minutes. A pending card order that never got a session, or whose expiry event was lost, stays until the shopper cancels it, so a scheduled check for old pending card orders is worth having in production.

## 33. Stripe events are applied once, and a payment after cancellation is refunded

**Decision.** The webhook verifies Stripe's signature over the raw body before reading anything. Each event id is stored in the same transaction as its effects, a lock on the id makes copies arriving together take turns, and the order row is locked while it is read and changed. A payment confirms the order only if the session says it is paid and the amount and currency match the order; a mismatch is logged and never accepted. A payment for an order that was already cancelled is recorded and then refunded, and that event is marked handled only after the refund succeeded. Events about anything else are ignored.

**Why.** Stripe sends each event at least once and again after any error, and a payment and an expiry for the same order can arrive together. Without the locks they could leave an order both cancelled with its stock returned and paid. Marking a refund event handled early would leave a customer charged for an order they do not have if the refund failed. Tests run many copies and a payment racing an expiry, and check the same end state every time.

**Cost.** Two locks per event and one more table. The refund is a call to Stripe, so it cannot be part of the database transaction.

## 34. Card payments use Stripe's hosted page, and the order page believes only the database

**Decision.** The shopper pays on a Stripe-hosted page, so card details never reach this app. The session is built from the order's own copies of names and prices, with the order number as the reference. Asking for the payment page again returns the same session, and "Pay now" on the order page does that. After paying, the shopper returns to the order page, which says "Confirming your payment" and asks again for a few seconds until the webhook has marked it paid; a `?paid=1` in the address never makes an order look paid. Cancelling an unpaid card order also closes its session. The confirmation email for a card order is sent when it is paid.

**Why.** A hosted page keeps the app out of card data rules. Building the session from the order means what is charged is what was shown and stored. Trusting the address for payment would let anyone type their way to a paid order.

**Cost.** A card order's confirmation can lag the redirect by a few seconds, and the page polls to cover it. Product images are sent to Stripe only when the site is on https, because Stripe fetches them itself.

## 35. Admins are made by an operator's command, and everyone else sees a 404

**Decision.** An account becomes an admin only when an operator runs `pnpm admin:grant <email>` against the database. The account must exist and have a verified address. `admin:revoke` takes the role away and refuses to remove the last admin unless forced; two revokes at the same moment cannot remove the last two. Every admin page checks the role on the server, and anyone who is not an admin gets the same "page not found" as a missing page. The role shown on the client only decides whether to show the "Admin" link.

**Why.** If the app can create admins, a flaw in the app can too. A command needs access to the database, which is already the real boundary of trust, and it works the same locally and in production. A list of addresses in the environment would tie access to a config value instead of a record, and recycled or mistyped addresses would grant rights. Answering with a 404 does not tell a visitor that an admin area exists.

**Cost.** Making an admin needs someone with database access. A person must sign up and verify their address first.

## 36. Every admin change is recorded in the same transaction

**Decision.** An audit entry says who did what to which record, in a sentence, and is written in the same transaction as the change. The person is stored as text (name and address at the time), so the entry survives deleting their account. Operator commands are recorded as the operator. The log can be read by admins and changed by no one in the app.

**Why.** Admins can refund money and change prices, and "who changed this?" must always have an answer. Writing the entry in the same transaction means a change cannot happen without its record, and a record cannot describe a change that failed.

**Cost.** One more write per admin change, and a table that only grows. Old entries can be archived when the volume calls for it.

## 37. Admins move orders along fixed steps, and a refund that fails stays owed

**Decision.** An admin can confirm, ship, deliver or cancel an order, and the allowed steps come from one function that both the screen and the server use, so a button never appears for something the server would refuse. A card order is confirmed only by its payment. Delivering a cash order is when its money is collected, so that is when it becomes paid. Cancelling puts the stock back, closes an unpaid card order's payment page, and refunds a paid card order. The refund is a call to Stripe, so the cancel is saved first; if the refund fails, the order stays cancelled with its payment still marked paid, which the page shows as a refund owed, with a button to retry it. The same idempotency key is used every time, so a refund is made once however often it is tried. Each change locks the order, writes its audit entry in the same transaction, and emails the customer afterwards.

**Why.** Setting any status from any status, as a plain dropdown does, lets a delivered order go back to pending and a cancel skip the stock and the refund. Locking the order means two admins pressing a button together, or a cancel racing a shipment, end in one consistent state. Keeping the refund outside the transaction means a Stripe outage never rolls back a cancel that should have happened, and "cancelled but paid" is a state a person can see and fix instead of money lost in between.

**Cost.** A cancelled paid order can briefly show as unrefunded. Emails are sent without waiting, so a mail failure is logged and not retried.

## 38. A stale form cannot overwrite a sale, and deleting a product is for good

**Decision.** The product form remembers the stock each size had when the page loaded. A save writes a size's stock only if the admin changed that number, and then only if the stock is still what the admin saw (a compare-and-set in the database). If it is not, the whole save is refused, nothing is kept, and the admin is told to reload. Sizes are identified by their label, so a size is added or removed but never renamed. The audit entry for an edit lists exactly what changed ("price $24.99 → $26.99; stock of M 5 → 8"), and a save that changes nothing writes nothing. Deleting a product removes it with its sizes and colors, asks first, and is recorded with the name and price; orders keep their own copy of what was bought, and carts already show a missing product as unavailable.

**Why.** Stock is also changed by every sale, so an admin form that writes the number it loaded would silently undo purchases made while the page was open, and the shop could then sell what it no longer has. Writing only what was edited, and only against the value that was seen, removes that. A plain delete keeps every catalog, cart and checkout query as it is; an "archived" flag would need a filter in each of them, and one missed filter would sell a hidden product.

**Cost.** An admin who loses the race has to reload and redo the change. A deleted product cannot be brought back, only added again.

## 39. Photos go straight to S3 with a signed form that S3 enforces

**Decision.** An admin asks the app for an upload form per photo. The app picks the key and signs a POST with conditions: size between 1 byte and 5 MB, and the exact content type asked for. The browser posts the file to the bucket directly. A key that comes back from the browser is trusted only after the object is read: it must exist, be within the limit, and begin with the bytes of a JPEG, PNG or WebP. Local development and every automated test run against an S3-compatible stand-in server, not a mock.

**Why.** Sending files through the app costs memory and request time and puts a size limit in the app's way. A signed PUT cannot limit size, so a huge file would be stored first and removed afterwards; a signed POST makes S3 refuse it. The type a browser reports and the name it gives are claims, so neither is used: the key is generated, and the type is read from the bytes. A mocked client would pass whatever the code asked for and prove nothing about the limits.

**Cost.** One more container in development and CI. A photo uploaded and never attached stays in the bucket until it is swept.

## 40. A file goes when nothing needs it, and an order's picture is something an order needs

**Decision.** Photos are saved with the product in the same transaction as its other changes, and only after the objects are checked (they exist, are within the size limit and are real images). A photo that is removed, or belongs to a product that is deleted, has its file deleted after that change is saved, except when a placed order still shows that file as its picture. The sample catalog's pictures are files of the app, have no key, and are never deleted. A save that lists a photo the product no longer has is refused as a whole, like a stale stock.

**Why.** An order keeps its own copy of what was bought, including the address of its picture. Deleting that file would turn the thumbnail in every past order into a broken image, so a file is kept for as long as an order shows it. Deleting after the commit means a failed deletion can never undo a saved product; a file left behind is harmless and is swept up later.

**Cost.** Photos of products that have been sold stay in storage after the product is gone. Between a delete and its files being removed there is a short time in which a file exists with no row; an order placed in the same instant as a photo is removed could copy an address whose file is then deleted.

## 41. Unused files are swept by a command, and a file stops being attachable before it can be swept

**Decision.** `pnpm storage:sweep` lists the bucket's photo files and deletes those older than 24 hours that no product row and no placed order refers to. It is a command an operator runs or schedules, like making an admin, and has a dry-run mode. A just-uploaded file is accepted onto a product for 12 hours only.

**Why.** Uploads that are never saved, and deletions that failed after a product was saved, leave files nothing refers to, and the bucket cannot know which are safe to remove. Doing it in the app on a timer would need a scheduler the app does not have. Checking for references and deleting are two steps, so a file attached between them could be deleted; making the attach window shorter than the sweep's wait means any file the sweep can take is already too old to attach, and no lock is needed.

**Cost.** An admin who leaves a product form open for more than half a day has to add the photos again. Until the sweep is scheduled, unused files stay.

## 42. Lists sort through the address, on a fixed list of columns

**Decision.** The admin order and product lists sort when a heading is chosen. The sort is two address parameters (`sort`, `dir`) read on the server against a fixed list of columns for each table; anything else falls back to the default order. The query maps each column to a database field and adds the row id as a last tie-breaker. The table is a server component with plain links in its headings; there is no client-side table state.

**Why.** Both lists already filter and page on the server through the address, so keeping the sort in the same place means one source of truth: a sorted view survives a reload, can be shared, works without scripts, and is kept by the search and the paging. A client-side table library would hold the same state a second time and could only sort the rows of one page, which is a wrong answer for a list of many pages. Accepting only named columns keeps the visitor's text out of the query, and the id tie-breaker stops a page repeating or dropping a row when many rows share the sorted value.

**Cost.** A sort is a page load, not an instant reorder. A column that is not stored in the database (for example the total stock of a product, which is a sum over sizes) cannot be sorted without extra work, so it is not offered.
