# AGENTS.md

Guidance for AI coding agents working in this repository. Human contributors should read [CONTRIBUTING.md](CONTRIBUTING.md), which this file builds on.

## Project

A clothing store built with Next.js (App Router), React and TypeScript. Only the scaffold exists so far: routes live in `src/app/`, and there is a single `GET /api/health` route handler, plus the error and not-found pages. Security headers are set in `next.config.ts`.

## Commands

| Command             | Use                                      |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Development server on port 3000          |
| `pnpm lint`         | ESLint                                   |
| `pnpm format:check` | Prettier check (`pnpm format` to fix)    |
| `pnpm typecheck`    | Route type generation and `tsc --noEmit` |
| `pnpm test`         | Vitest, single run                       |
| `pnpm build`        | Production build                         |

Run lint, format check, typecheck and tests before declaring a change done.

## Conventions

- Strict TypeScript. No `any`, no unused variables (prefix with `_` when intentional).
- Use the `@/` alias for imports from `src/`. Import order is applied by Prettier, so run `pnpm format` instead of ordering by hand.
- No `console.log`.
- Tests sit next to the code as `*.test.ts(x)` and run in Node by default.
- Record a design decision in `docs/decisions.md` in the same pull request that makes it.
- Add a dependency only when the platform and the existing dependencies do not cover the need.

## Git

- Conventional Commits, small pull requests, squash merge. Details are in [CONTRIBUTING.md](CONTRIBUTING.md).
- Never bypass the hooks (`--no-verify`).
- Do not commit environment files, and do not edit `pnpm-lock.yaml` by hand.

## Next.js

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
