# Clothing Store

An online clothing store, built end to end with Next.js and TypeScript. The repository is assembled one reviewed pull request at a time, and each change ships with its tests and documentation.

## Status

Foundation: project scaffold, quality gates, CI, and a PostgreSQL database wired in with Prisma. Features are added in later pull requests, and this README grows with them.

## Stack

| Area            | Choice                                         |
| --------------- | ---------------------------------------------- |
| Framework       | Next.js (App Router), React, TypeScript strict |
| Database        | PostgreSQL 16, Prisma 7                        |
| Configuration   | Environment validated at startup (zod)         |
| Package manager | pnpm                                           |
| Linting         | ESLint (Next.js config) and Prettier           |
| Tests           | Vitest (unit and integration)                  |
| Git workflow    | Husky, lint-staged, commitlint                 |
| CI              | GitHub Actions                                 |

## Getting started

Requires [Node.js](https://nodejs.org) 24, [pnpm](https://pnpm.io) 12 (`corepack enable` picks up the pinned version) and [Docker](https://www.docker.com).

```bash
pnpm install
cp .env.example .env
pnpm compose        # starts the development and test databases
pnpm dev
```

The app runs on http://localhost:3000.

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
| `pnpm test` / `pnpm test:watch`      | Unit tests, once or in watch mode           |
| `pnpm test:integration`              | Integration tests (needs `pnpm compose`)    |
| `pnpm compose` / `pnpm compose:down` | Start or stop the local databases           |
| `pnpm db:generate`                   | Generate the Prisma client                  |
| `pnpm db:migrate` / `pnpm db:deploy` | Create and apply, or only apply, migrations |
| `pnpm db:studio`                     | Browse the database                         |

## Project structure

```text
src/app/          routes, layouts, error and not-found pages, route handlers
src/env.ts        the validated environment, the only place variables are read
src/lib/db.ts     the Prisma client
src/test/         test helpers and global setup
prisma/           schema and migrations
docker/           local PostgreSQL (development and test databases)
docs/             design decisions
.github/          CI workflow, shared setup action, Dependabot, PR template
.husky/           Git hooks: lint-staged on commit, commitlint on message
```

## Testing

Unit tests (`*.test.ts`) need nothing running. Integration tests (`*.integration.test.ts`) use the real test database from `pnpm compose`, run one file at a time, and have their migrations applied automatically before the run.

## Quality gates

Locally, a pre-commit hook lints and formats staged files, and a commit-msg hook enforces [Conventional Commits](https://www.conventionalcommits.org). CI runs lint, format, typecheck, unit and integration tests and a build on every pull request, and checks every commit message in it.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, and [docs/decisions.md](docs/decisions.md) for the reasoning behind the main choices.
