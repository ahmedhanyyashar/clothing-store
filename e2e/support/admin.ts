import { spawnSync } from "node:child_process"

/**
 * Runs the operator's command (`pnpm admin:grant` / `admin:revoke`) against the
 * test database, exactly as an operator would. The environment is the test
 * runner's, which already points at that database.
 */
export function adminCommand(
  command: "grant" | "revoke",
  email: string,
  ...flags: string[]
) {
  const result = spawnSync(
    "pnpm",
    [`admin:${command}`, email, ...flags],
    { encoding: "utf8", shell: true, env: process.env }
  )
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  }
}
