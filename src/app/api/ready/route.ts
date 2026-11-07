import { prisma } from "@/lib/db"

// Readiness: can this instance serve requests that need the database? Kept
// apart from /api/health so a database outage takes an instance out of
// rotation without getting it killed and replaced.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ status: "ok" })
  } catch (error) {
    console.error("readiness check failed", error)
    return Response.json(
      { status: "unavailable" },
      { status: 503 }
    )
  }
}
