"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

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
      <Button asChild variant="ghost" className="max-w-40">
        <Link href="/account" className="truncate">
          {session.user.name}
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
