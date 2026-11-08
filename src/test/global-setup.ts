import { execSync } from "node:child_process"

import { ensureLocalBucket } from "@/lib/storage/setup"

// Brings the test database up to date and creates the photo bucket before the
// integration tests run.
export default async function setup() {
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
  })
  await ensureLocalBucket()
}
