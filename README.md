# Clothing Store

An online clothing store, built end to end with Next.js and TypeScript. The repository is assembled one reviewed pull request at a time, and each change ships with its tests and documentation.

## Status

Foundation: project scaffold, quality gates, CI, a PostgreSQL database wired in with Prisma, the design system with the page shell, and transactional email, and authentication. Features are added in later pull requests, and this README grows with them.

## Stack

| Area            | Choice                                         |
| --------------- | ---------------------------------------------- |
| Framework       | Next.js (App Router), React, TypeScript strict |
| Styling         | Tailwind CSS 4, shadcn/ui (Radix), Lucide      |
| Authentication  | Better Auth: email and password, Google        |
| Email           | Nodemailer over SMTP, Mailpit locally          |
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
pnpm dev
```

The app runs on http://localhost:3000. Edit `.env` first: set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and the Google credentials (see the comments in `.env.example`). Every email the app sends, such as verification and password-reset links, lands in Mailpit at http://localhost:8025.

| Endpoint          | Meaning                                                        |
| ----------------- | -------------------------------------------------------------- |
| `GET /api/health` | Liveness: the process is running                               |
| `GET /api/ready`  | Readiness: the database answers (`503` with no details if not) |

## Scripts

| Script                               | Purpose                                     |
| ------------------------------------ | ------------------------------------------- |
| `pnpm dev`                           | Start the development server                |
| `pnpm build` / `pnpm start`          | Production build, and serve it              |
| `pnpm lint` / `pnpm lint:fix`        | Check, or fix, lint errors                  |
| `pnpm format` / `pnpm format:check`  | Write, or check, formatting                 |
| `pnpm typecheck`                     | Generate route types and run `tsc`          |
| `pnpm test` / `pnpm test:watch`      | Unit and component tests, once or watching  |
| `pnpm test:integration`              | Integration tests (needs `pnpm compose`)    |
| `pnpm test:e2e`                      | End-to-end tests in a browser (see Testing) |
| `pnpm compose` / `pnpm compose:down` | Start or stop the local databases           |
| `pnpm db:generate`                   | Generate the Prisma client                  |
| `pnpm db:migrate` / `pnpm db:deploy` | Create and apply, or only apply, migrations |
| `pnpm db:studio`                     | Browse the database                         |

## Project structure

```text
src/app/          routes, layouts, error and not-found pages, route handlers
src/components/   ui/ holds shadcn primitives, layout/ the page shell
src/env.ts        the validated environment, the only place variables are read
src/lib/db/       the Prisma client
src/lib/auth/     Better Auth setup, server-side guards and form schemas
src/lib/email/    SMTP mailer and email templates
src/proxy.ts      redirects for signed-out and signed-in visitors
src/test/         test helpers and global setup
prisma/           schema and migrations
docker/           local PostgreSQL (development and test databases) and the mail catcher
e2e/              end-to-end tests (Playwright)
docs/             design decisions
.github/          CI workflow, shared setup action, Dependabot, PR template
.husky/           Git hooks: lint-staged on commit, commitlint on message
```

## Authentication

- **Sign-up** needs a verified email address: the account cannot sign in until the emailed link is used. Google sign-in is also available.
- **Passwords** must be at least 12 characters. A reset link signs the user out everywhere.
- **Responses never reveal** whether an email address has an account.
- **Access control** is checked on the server with `requireUser` and `requireRole` from `src/lib/auth/session.ts`. The proxy only redirects early.
- **Roles** are `USER` and `ADMIN`. A role cannot be set from a request.

## Testing

Unit tests (`*.test.ts`) need nothing running. Component tests (`*.test.tsx`) render React in a simulated browser and include an accessibility check with axe. Integration tests (`*.integration.test.ts`) use the real test database from `pnpm compose`, run one file at a time, and have their migrations applied automatically before the run. End-to-end tests (`e2e/*.spec.ts`) drive a real browser through sign-up, email verification, sign-in and password reset against a production build, reading the emails from Mailpit. They need `pnpm compose` running and, the first time, `pnpm exec playwright install chromium`. They use the test database, so do not run them at the same time as the integration tests.

## Quality gates

Locally, a pre-commit hook lints and formats staged files, and a commit-msg hook enforces [Conventional Commits](https://www.conventionalcommits.org). CI runs lint, format, typecheck, unit, component, integration and end-to-end tests and a build on every pull request, and checks every commit message in it.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, and [docs/decisions.md](docs/decisions.md) for the reasoning behind the main choices.
