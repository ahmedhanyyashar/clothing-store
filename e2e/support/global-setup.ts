import { execSync } from "node:child_process"

// The browsing tests need products to browse. This brings the test database up
// to date and loads the sample catalog into it before the first test runs.
export default function globalSetup() {
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
  })
  execSync("pnpm exec prisma db seed", { stdio: "inherit" })
}
