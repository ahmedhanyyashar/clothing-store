// pnpm admin:grant <email>
// pnpm admin:revoke <email> [--force]
//
// Run by an operator, against the database in DATABASE_URL. This is the only
// way to create an admin: nothing in the web app can.
import { grantAdmin, revokeAdmin } from "@/lib/admin/roles"
import { prisma } from "@/lib/db/client"

const [command, email, ...flags] = process.argv.slice(2)

const MESSAGES = {
  granted: "Done. They are an admin now.",
  "already-admin":
    "Nothing to do: they are already an admin.",
  "not-found": "No account has that email address.",
  "not-verified":
    "That account has not verified its email address yet, so it cannot be made an admin.",
  revoked: "Done. They are no longer an admin.",
  "not-admin": "Nothing to do: they are not an admin.",
  "last-admin":
    "They are the only admin. Make another admin first, or add --force.",
} as const

async function main() {
  if (
    (command !== "grant" && command !== "revoke") ||
    !email
  ) {
    console.error("Usage: pnpm admin:grant <email>")
    console.error(
      "       pnpm admin:revoke <email> [--force]"
    )
    return 2
  }

  const result =
    command === "grant"
      ? await grantAdmin(email)
      : await revokeAdmin(email, {
          force: flags.includes("--force"),
        })

  console.log(MESSAGES[result])
  return result === "granted" || result === "revoked"
    ? 0
    : 1
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
