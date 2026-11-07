# AGENTS.md

Guidance for AI coding agents working in this repository. Human contributors should read [CONTRIBUTING.md](CONTRIBUTING.md), which this file builds on.

## Project

A clothing store built with Next.js (App Router), React and TypeScript, backed by PostgreSQL through Prisma, styled with Tailwind CSS 4 and shadcn/ui, with Better Auth for authentication and SMTP for email. Only the foundation exists so far: routes live in `src/app/` (health and readiness handlers, error and not-found pages), the page shell is in `src/components/layout/`, the shadcn primitives are in `src/components/ui/`, the validated environment is in `src/env.ts`, the database client is in `src/lib/db/client.ts`, and the Prisma schema holds the authentication models. Security headers are set in `next.config.ts`.

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

### Auth

- Protect every page, route handler and action by calling `requireUser` or `requireRole` from `@/lib/auth/session` inside it. The proxy is only an early redirect and is never the access check.
- The role on the client session is for display. Never authorize from it in the browser.
- Responses must not reveal whether an email address has an account.
- Do not await `sendEmail` inside an auth callback: a slow mail server would make the response time reveal whether an address is registered.
- Forms use react-hook-form with a zod schema from `@/lib/auth/validations`, set `noValidate`, and show server errors in a `role="alert"` element.

### UI

- Style with Tailwind utilities and the tokens from `src/app/globals.css` (`bg-background`, `text-muted-foreground`, and so on). Never use raw colors; every color must work in light and dark mode.
- Add a primitive with the shadcn CLI only when a feature needs it, so `src/components/ui/` holds nothing unused. Do not edit it for feature styling; compose it instead.
- Join class names with `cn()` from `@/lib/utils`. Prettier sorts Tailwind classes.
- Compose pages inside `Container`. Interactive elements need an accessible name.

### Tests

- Tests sit next to the code. `*.test.ts` is a unit test: fast, isolated, no database. `*.test.tsx` is a component test: it runs in jsdom and should include an axe accessibility check for new UI. `*.integration.test.ts` talks to the real test database.
- `e2e/*.spec.ts` are Playwright tests against a production build on port 3100. Import `test` and `expect` from `e2e/support/test`: its fixtures give every test a new user and its own client address, so tests share no state and never trip the rate limiter. Navigate with `open()` from `e2e/support/flows`, which waits for hydration; typing into a form earlier is lost. Read emails through `waitForLink` from `e2e/support/mailpit`.
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
