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
