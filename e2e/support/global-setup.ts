import { execSync } from "node:child_process"

import { ensureLocalBucket } from "../../src/lib/storage/setup"

// The browsing tests need products to browse, and the product tests need a
// bucket for photos. This brings the test database up to date, loads the sample
// catalog into it and creates the bucket before the first test runs.
export default async function globalSetup() {
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
  })
  execSync("pnpm exec prisma db seed", { stdio: "inherit" })
  await ensureLocalBucket()
}
