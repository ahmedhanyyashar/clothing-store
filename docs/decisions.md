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
