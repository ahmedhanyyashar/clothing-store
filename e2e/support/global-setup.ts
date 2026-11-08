import { execSync } from "node:child_process"

import { ensureLocalBucket } from "../../src/lib/storage/setup"

// The browsing tests need products to browse, the product tests need a bucket
// for photos, and the demo test needs the demo customer. This brings the test
// database up to date, loads the sample catalog and that account into it, and
// creates the bucket before the first test runs.
export default async function globalSetup() {
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
  })
  execSync("pnpm exec tsx prisma/seed.ts --demo-customer", {
    stdio: "inherit",
  })
  await ensureLocalBucket()
}
