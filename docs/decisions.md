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
