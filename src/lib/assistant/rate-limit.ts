import { prisma } from "@/lib/db/client"

/**
 * Counts one request against `key` in a fixed window kept in the shared
 * `rate_limit` table, so the limit holds across server instances. The window
 * starts at the first request and restarts once it has passed. Returns false
 * when the limit is already used up.
 */
export async function takeRequest(
  key: string,
  limit: number,
  windowMs: number
) {
  const now = BigInt(Date.now())
  const windowStart = now - BigInt(windowMs)
  const id = `assistant:${key}`

  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit (id, key, count, "lastRequest")
    VALUES (${id}, ${id}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limit."lastRequest" < ${windowStart} THEN 1
        ELSE rate_limit.count + 1
      END,
      "lastRequest" = CASE
        WHEN rate_limit."lastRequest" < ${windowStart} THEN ${now}
        ELSE rate_limit."lastRequest"
      END
    RETURNING count
  `
  return row!.count <= limit
}
