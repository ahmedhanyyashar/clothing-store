# Design decisions

Short records of the choices that shaped the code: what was chosen, why, and what it costs. Newest decisions go at the bottom.

## 1. One pull request, one squashed commit, Conventional Commits

**Decision.** Work lands through small pull requests merged with squash, so `main` is linear and each pull request is one commit. Commit messages and pull request titles follow Conventional Commits, enforced by commitlint locally and in CI.

**Why.** A linear history reads as a changelog and makes any change easy to revert. A fixed message format keeps the history searchable and lets release notes be generated later.

**Cost.** Commits inside a pull request are not kept on `main`, so the pull request description has to carry the reasoning.

## 2. TypeScript 6 and ESLint 9, not the newest majors

**Decision.** Dependencies track the latest releases, except TypeScript, held at 6.x, and ESLint, held at 9.x.

**Why.** `typescript-eslint` refuses to run on TypeScript 7, and the plugins bundled in `eslint-config-next` declare no support for ESLint 10. Linting is a required check, so both stay on the newest versions the toolchain supports.

**Cost.** ESLint 9 is marked deprecated, so installs print a warning. Both pins are revisited once the plugins catch up.

## 3. Security headers now, Content-Security-Policy later

**Decision.** `next.config.ts` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and `Strict-Transport-Security` on every route. A Content-Security-Policy is not set yet.

**Why.** The first group is safe independent of what the app loads. A useful policy has to name the scripts, images and connections the app actually uses, and none of those exist yet. A policy written now would either be too loose to matter or would break features later.

**Cost.** Until the policy lands, injected scripts are not constrained by the browser. It is added in the slice that introduces the first third-party origin.

## 4. The health check is liveness only

**Decision.** `GET /api/health` returns `{ "status": "ok" }` without checking any dependency.

**Why.** It answers one question: is this process running? If it also failed on an unavailable dependency, an outage elsewhere would get healthy instances killed and replaced.

**Cost.** It does not report whether the app can serve real requests. A readiness check, if needed, is a separate endpoint.
