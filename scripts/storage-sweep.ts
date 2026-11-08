// pnpm storage:sweep [--dry-run]
//
// Run by an operator (or on a schedule), against the database in DATABASE_URL
// and the bucket in S3_BUCKET. Deletes photo files that are more than a day
// old and that no product and no placed order refers to.
import { prisma } from "@/lib/db/client"
import { SWEEP_AFTER_MS } from "@/lib/storage/rules"
import { sweepUnusedPhotos } from "@/lib/storage/sweep"

const dryRun = process.argv.includes("--dry-run")

sweepUnusedPhotos({
  before: new Date(Date.now() - SWEEP_AFTER_MS),
  dryRun,
})
  .then(({ checked, removed }) => {
    console.log(
      `${dryRun ? "Would delete" : "Deleted"} ${removed.length} of ${checked} files.`
    )
    for (const key of removed) console.log(`  ${key}`)
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
