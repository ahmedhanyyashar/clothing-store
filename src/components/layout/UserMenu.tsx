"use client"

import { CircleUser } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/client"

// The session is read in the browser, so no page becomes dynamic just because
// the header is on it. The placeholder keeps the layout from shifting.
export function UserMenu() {
  const router = useRouter()
  const { data: session, isPending } =
    authClient.useSession()

  if (isPending) {
    return <div className="h-9 w-40" aria-hidden="true" />
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild>
          <Link href="/sign-up">Sign up</Link>
        </Button>
      </div>
    )
  }

  async function signOut() {
    await authClient.signOut()
    toast.success("Signed out.")
    router.push("/")
    // drop cached pages that were rendered for the previous user
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {/* display only: every admin page checks the role on the server */}
      {session.user.role === "ADMIN" && (
        <Button asChild variant="ghost">
          <Link href="/admin">Admin</Link>
        </Button>
      )}
      <Button
        asChild
        variant="ghost"
        size="icon"
        title={session.user.name}
      >
        <Link
          href="/account"
          aria-label={`Account of ${session.user.name}`}
        >
          <CircleUser aria-hidden="true" />
        </Link>
      </Button>
      <Button
        variant="outline"
        onClick={() => void signOut()}
      >
        Sign out
      </Button>
    </div>
  )
}
