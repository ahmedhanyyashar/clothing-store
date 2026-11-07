import { PrismaPg } from "@prisma/adapter-pg"

import { env } from "@/env"
import { PrismaClient } from "@/generated/prisma/client"

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
    }),
  })
}

// Reused across hot reloads in development, so each reload doesn't open a
// new connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
