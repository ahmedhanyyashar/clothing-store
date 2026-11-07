# Contributing

## Workflow

1. Branch from an up-to-date `main`, named `<type>/<short-description>`, for example `feat/product-catalog`.
2. Keep the change small and focused: one concern per pull request, with its tests and documentation.
3. Open a pull request using the template. CI must pass.
4. Merge with **squash**, so `main` stays linear and each pull request is one commit.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org), enforced by commitlint locally and in CI.

```text
<type>(<optional scope>): <imperative summary, lower case, no period>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Explain the reason in the body when it is not obvious. The pull request title uses the same format, since it becomes the squashed commit.

## Before pushing

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

The git hooks are part of the workflow. Do not bypass them with `--no-verify`.

## Code conventions

- TypeScript is strict. `any` is an error and unused variables are errors unless prefixed with `_`.
- Import with the `@/` alias for anything under `src/`. Import order is enforced by Prettier.
- No `console.log`. `console.warn` and `console.error` are allowed.
- Tests sit next to the code as `*.test.ts(x)`.
