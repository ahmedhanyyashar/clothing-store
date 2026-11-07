// Liveness only: no dependency checks, so an outage elsewhere can't get
// healthy instances killed and replaced.
export function GET() {
  return Response.json({ status: "ok" })
}
