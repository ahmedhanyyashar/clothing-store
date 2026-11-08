import { ensureLocalBucket } from "../src/lib/storage/setup"

// Creates the photo bucket on the local stand-in server (`pnpm storage:setup`).
await ensureLocalBucket()
console.log("Photo bucket ready.")
