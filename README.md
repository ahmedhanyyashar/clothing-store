# Clothing Store

An online clothing store, built end to end with Next.js and TypeScript. The repository is assembled one reviewed pull request at a time, and each change ships with its tests and documentation.

## Stack

| Area            | Choice                                         |
| --------------- | ---------------------------------------------- |
| Framework       | Next.js (App Router), React, TypeScript strict |
| Package manager | pnpm                                           |
| Linting         | ESLint (Next.js config) and Prettier           |
| Tests           | Vitest                                         |
| Git workflow    | Husky, lint-staged, commitlint                 |
| CI              | GitHub Actions                                 |

## Getting started

Requires [Node.js](https://nodejs.org) 24 and [pnpm](https://pnpm.io) 12 (`corepack enable` picks up the pinned version).

```bash
pnpm install
pnpm dev
```

The app runs on http://localhost:3000, and `GET /api/health` returns `{ "status": "ok" }`.

## Scripts

| Script                          | Purpose                              |
| ------------------------------- | ------------------------------------ |
| `pnpm dev`                      | Start the development server         |
| `pnpm build` / `pnpm start`     | Production build, and serve it       |
| `pnpm lint` / `pnpm lint:fix`   | Check, or fix, lint errors           |
| `pnpm format` / `format:check`  | Write, or check, formatting          |
| `pnpm typecheck`                | Generate route types and run `tsc`   |
| `pnpm test` / `pnpm test:watch` | Run the tests once, or in watch mode |

## Project structure

```text
src/app/          routes, layouts, error and not-found pages, route handlers
docs/            design decisions
.github/          CI workflow, shared setup action, Dependabot, PR template
.husky/           Git hooks: lint-staged on commit, commitlint on message
```

## Quality gates

Locally, a pre-commit hook lints and formats staged files, and a commit-msg hook enforces [Conventional Commits](https://www.conventionalcommits.org). CI runs lint, format, typecheck, tests and a build on every pull request, and checks every commit message in it.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, and [docs/decisions.md](docs/decisions.md) for the reasoning behind the main choices.
