import { getSessionCookie } from "better-auth/cookies"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedRoutes = ["/account", "/checkout", "/admin"]
const authRoutes = ["/sign-in", "/sign-up"]

// Only checks that a session cookie exists, to save a round trip. It does not
// prove the session is valid, so pages and actions still call requireUser().
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = Boolean(getSessionCookie(request))

  if (!hasSession && matches(protectedRoutes, pathname)) {
    const signIn = new URL("/sign-in", request.url)
    signIn.searchParams.set("redirect", pathname + search)
    return NextResponse.redirect(signIn)
  }

  if (hasSession && matches(authRoutes, pathname)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

function matches(routes: string[], pathname: string) {
  return routes.some(
    (route) =>
      pathname === route || pathname.startsWith(`${route}/`)
  )
}

export const config = {
  matcher: [
    "/account/:path*",
    "/checkout",
    "/admin/:path*",
    "/sign-in",
    "/sign-up",
  ],
}
