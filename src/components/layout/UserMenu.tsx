"use client"

import { CircleUser } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth/client"

// The session is read in the browser, so no page becomes dynamic just because
// the header is on it. The placeholder keeps the layout from shifting.
export function UserMenu() {
  const router = useRouter()
  const { data: session, isPending } =
    authClient.useSession()

  if (isPending) {
    return (
      <div
        className="h-9 w-20 sm:w-40"
        aria-hidden="true"
      />
    )
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        {/* the sign-in page links to sign-up, so the narrow header leaves it out */}
        <span className="hidden sm:inline-flex">
          <Button asChild>
            <Link href="/sign-up">Sign up</Link>
          </Button>
        </span>
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

  const label = `Account of ${session.user.name}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={label}
          aria-label={label}
        >
          <CircleUser aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {session.user.name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">Account</Link>
        </DropdownMenuItem>
        {/* display only: every admin page checks the role on the server */}
        {session.user.role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">Admin</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void signOut()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
