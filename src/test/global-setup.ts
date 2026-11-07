import { execSync } from "node:child_process"

// Brings the test database up to date before the integration tests run.
export default function setup() {
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
  })
}
